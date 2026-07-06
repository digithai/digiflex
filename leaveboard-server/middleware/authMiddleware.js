import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to protect routes and verify JWT token
// This middleware checks if the request has a valid JWT token in the Authorization header
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Build query - for superadmins, don't require tenant match
    const userQuery = { _id: decoded.userId };
    if (decoded.tenantId) {
      userQuery.tenant = decoded.tenantId;
    }

    const user = await User.findOne(userQuery)
      .select('-password')
      .populate('tenant', 'name slug isActive');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    if (user.tenant && user.tenant.isActive === false && !isSuperAdminRole(user.role)) {
      return res.status(403).json({ message: 'Tenant is inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const isSuperAdminRole = (role) => role === 'superadmin';
export const isTenantAdminRole = (role) => role === 'tenant_admin';

// Middleware to check if the user can approve/manage tenant-level operations
export const adminOnly = (req, res, next) => {
  if (req.user && [isSuperAdminRole(req.user.role), isTenantAdminRole(req.user.role), req.user.role === 'approver'].some(Boolean)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Superadmin/Tenant admin/Approver only.' });
  }
};

export const tenantAdminOnly = (req, res, next) => {
  if (req.user && (isSuperAdminRole(req.user.role) || isTenantAdminRole(req.user.role))) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Tenant admin only.' });
};

export const superAdminOnly = (req, res, next) => {
  if (req.user && isSuperAdminRole(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Superadmin only.' });
};
