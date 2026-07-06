import express from 'express';
import { protect, adminOnly, isTenantAdminRole } from '../middleware/authMiddleware.js';
import { getWfhSettings, updateWfhSettings } from '../controllers/settingsController.js';

const router = express.Router();

// All authenticated users can read WFH settings (for displaying rules)
router.get('/wfh', protect, getWfhSettings);

// Only tenant admin/approver/superadmin can update WFH settings
router.put('/wfh', protect, adminOnly, updateWfhSettings);

router.get('/roles', protect, (req, res) => {
  if (isTenantAdminRole(req.user?.role)) {
    return res.json(['user', 'approver']);
  }
  return res.json(['user', 'approver', 'tenant_admin']);
});

export default router;
