import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import { resolveTenantFromRequest } from '../utils/tenant.js';
import { isSuperAdminRole } from '../middleware/authMiddleware.js';

export const loginUser = async (req, res) => {
  try {
    const { email, password, tenantSlug } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    let user = await User.findOne({ email }).populate('tenant', 'name slug isActive');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Superadmins don't need tenant context
    if (!isSuperAdminRole(user.role) && !user.tenant) {
      return res.status(500).json({ message: 'User tenant context is missing' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is inactive' });
    }

    const userTenant = user.tenant;
    if (userTenant && !userTenant.isActive && !isSuperAdminRole(user.role)) {
      return res.status(403).json({ message: 'Tenant is inactive' });
    }

    if (!isSuperAdminRole(user.role) && tenantSlug) {
      const tenant = await resolveTenantFromRequest(req);
      if (!tenant) {
        return res.status(400).json({ message: 'Invalid tenant slug' });
      }

      if (String(user.tenant?._id || user.tenant) !== String(tenant._id)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tenantId = user.tenant?._id || user.tenant;
    const accessToken = generateAccessToken(user._id, tenantId || null);
    const refreshToken = generateRefreshToken(user._id, tenantId || null);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        team: user.team,
        office: user.office,
        country: user.country,
        wfhWeekly: user.wfhWeekly,
        leaveCounts: user.leaveCounts,
        isActive: user.isActive,
        tenant: user.tenant,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
