import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import WfhRequest from '../models/WfhRequest.js';
import { protect, tenantAdminOnly, isSuperAdminRole, isTenantAdminRole } from '../middleware/authMiddleware.js';
import { validatePassword } from '../utils/validation.js';

const router = express.Router();

// Get all users (admin only)
router.get('/users', protect, tenantAdminOnly, async (req, res) => {
  const users = await User.find({ tenant: req.user.tenant._id }).select('-password');
  res.json(users);
});

// Delete a user
router.delete('/users/:id', protect, tenantAdminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    // Do not allow deletion of superadmin or tenant admin accounts
    const target = await User.findOne({ _id: userId, tenant: req.user.tenant._id });
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (isSuperAdminRole(target.role) || isTenantAdminRole(target.role)) {
      return res.status(403).json({ message: 'You cannot delete a superadmin or tenant admin account' });
    }

    // First, delete all WFH requests by this user
    await WfhRequest.deleteMany({ tenant: req.user.tenant._id, user: userId });

    // Then delete the user
    const user = await User.findOneAndDelete({ _id: userId, tenant: req.user.tenant._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User and related WFH requests deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user password
router.put('/users/:id/password', protect, tenantAdminOnly, async (req, res) => {
  const { password } = req.body;

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const user = await User.findOne({ _id: req.params.id, tenant: req.user.tenant._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's wfhWeekly
router.put('/users/:id/wfhWeekly', protect, tenantAdminOnly, async (req, res) => {
  try {
    const { wfhWeekly } = req.body;
    const num = Number(wfhWeekly);

    if (Number.isNaN(num) || num < 0) {
      return res.status(400).json({ message: 'wfhWeekly must be a non-negative number' });
    }

    const user = await User.findOne({ _id: req.params.id, tenant: req.user.tenant._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.wfhWeekly = num;
    await user.save();

    res.json({ message: 'wfhWeekly updated successfully', wfhWeekly: user.wfhWeekly });
  } catch (err) {
    console.error('Error updating wfhWeekly:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's role
router.put('/users/:id/role', protect, tenantAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'approver', 'tenant_admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findOne({ _id: req.params.id, tenant: req.user.tenant._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent users from changing their own role
    if (req.user._id.toString() === req.params.id) {
      return res.status(403).json({ message: 'You cannot change your own role' });
    }

    // Prevent promoting to tenant_admin if not superadmin
    if (role === 'tenant_admin' && !isSuperAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Only superadmins can promote users to tenant admin' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Role updated successfully', role: user.role });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's position
router.put('/users/:id/position', protect, tenantAdminOnly, async (req, res) => {
  try {
    const { position } = req.body;
    const validPositions = ['Dev', 'CEO', 'COO', 'CTO', 'HR', 'QA', 'PO', 'Sales', ''];

    if (!validPositions.includes(position)) {
      return res.status(400).json({ message: 'Invalid position' });
    }

    const user = await User.findOne({ _id: req.params.id, tenant: req.user.tenant._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.position = position;
    await user.save();

    res.json({ message: 'Position updated successfully', position: user.position });
  } catch (err) {
    console.error('Error updating position:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
