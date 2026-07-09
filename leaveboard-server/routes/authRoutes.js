import express from 'express';
import rateLimit from 'express-rate-limit';
import { loginUser } from '../controllers/authController.js';
import { protect, tenantAdminOnly, isSuperAdminRole } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { resolveTenantFromRequest } from '../utils/tenant.js';
import { validateEmail, validatePassword } from '../utils/validation.js';

const router = express.Router();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 failed requests per windowMs
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins toward the limit
  skipFailedRequests: false, // Count failed requests
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    console.log('[RATE LIMIT] Login rate limit exceeded for IP:', req.ip);
    res.status(429).json({ message: 'Too many authentication attempts, please try again later.' });
  },
});

const passwordRecoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password recovery requests per hour
  message: { message: 'Too many password recovery attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, including failed ones
  skipFailedRequests: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    console.log('[RATE LIMIT] Password recovery rate limit exceeded for IP:', req.ip);
    res.status(429).json({ message: 'Too many password recovery attempts, please try again later.' });
  },
});

// ✅ login route now calls the real controller with rate limiting
router.post('/login', (req, res, next) => {
  console.log('[AUTH] Login attempt from IP:', req.ip);
  authLimiter(req, res, next);
}, loginUser);

// Admin creates user
router.post('/register', protect, tenantAdminOnly, async (req, res) => {
  const { name, email, password, role, position, team, office, country, wfhWeekly, leaveCounts } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const normalizedRole = String(role || '').trim().toLowerCase();
  const allowedRolesByActor = isSuperAdminRole(req.user.role)
    ? ['tenant_admin', 'approver', 'user']
    : ['approver', 'user'];

  if (!allowedRolesByActor.includes(normalizedRole)) {
    return res.status(403).json({ message: 'You cannot create this role' });
  }

  const existingUser = await User.findOne({ email, tenant: req.user.tenant._id });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);

  // Build payload, applying types where relevant and only setting optional fields if provided
  const userPayload = {
    name,
    email,
    password: hashedPassword,
    role: normalizedRole,
    position,
    team,
    office,
    country,
    tenant: req.user.tenant._id,
  };

  // Only set wfhWeekly if provided (non-empty), otherwise let schema default apply
  if (wfhWeekly !== undefined && wfhWeekly !== '') {
    userPayload.wfhWeekly = Number(wfhWeekly);
  }

  // Optionally allow leaveCounts to be set if provided
  if (leaveCounts && typeof leaveCounts === 'object') {
    userPayload.leaveCounts = {};
    if (leaveCounts.sickLeave !== undefined && leaveCounts.sickLeave !== '') {
      userPayload.leaveCounts.sickLeave = Number(leaveCounts.sickLeave);
    }
    if (leaveCounts.timeOff !== undefined && leaveCounts.timeOff !== '') {
      userPayload.leaveCounts.timeOff = Number(leaveCounts.timeOff);
    }
    // Remove leaveCounts if it ended up empty so defaults can apply
    if (Object.keys(userPayload.leaveCounts).length === 0) {
      delete userPayload.leaveCounts;
    }
  }

  const user = await User.create(userPayload);

  // Send welcome email to the newly created user (non-blocking for response)
  setImmediate(() => {
    sendEmail({
      to: user.email,
      subject: 'Welcome to LeaveBoard',
      text: `Hi ${user.name},\n\nYour account has been created successfully. You can now log in and start using the system.`,
    }).catch(err => {
      console.error('[AUTH] Failed to send welcome email:', err);
    });
  });

  res.status(201).json({ message: 'User created successfully', user });
});

// Token refresh route
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const payload = { userId: decoded.userId };
    if (decoded.tenantId) {
      payload.tenantId = decoded.tenantId;
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

    return res.json({ token: accessToken });
  });
});

// Recover password route with rate limiting
router.post('/recover', (req, res, next) => {
  console.log('[AUTH] Password recovery attempt from IP:', req.ip);
  passwordRecoveryLimiter(req, res, next);
}, async (req, res) => {
  const { email } = req.body;

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  try {
    let tenant = await resolveTenantFromRequest(req);
    let user = null;

    if (!tenant) {
      const users = await User.find({ email }).populate('tenant', 'name slug');
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (users.length > 1) {
        return res.status(400).json({ message: 'Tenant slug is required for this account' });
      }
      user = users[0];
      tenant = user.tenant;
    }

    if (!user) {
      user = await User.findOne({ email, tenant: tenant._id }).populate('tenant', 'name slug');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    // send email to all tenant admins for the user's tenant
    const tenantAdmins = await User.find({ tenant: tenant._id, role: 'tenant_admin' });
    if (tenantAdmins.length === 0) {
      return res.status(500).json({ message: 'No tenant admins found to handle recovery request' });
    }

    const adminEmails = tenantAdmins.map(admin => admin.email);
    console.log(`[AUTH] Password recovery requested by ${user.email} from tenant ${tenant?.name || 'Unknown'}. Sent to tenant admins: ${adminEmails.join(', ')}`);
    await sendEmail({
      to: adminEmails,
      subject: `Password Recovery for ${user.name}`,
      text: `User ${user.name} (${user.email}) from ${tenant?.name || 'Unknown tenant'} requested a password reset.`
    });

    res.json({ message: 'Recovery request sent to admin' });
  } catch(err) {
    console.error('[AUTH] Error in recover route:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
