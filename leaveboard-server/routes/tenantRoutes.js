import express from 'express';
import { protect, superAdminOnly } from '../middleware/authMiddleware.js';
import { listTenants, createTenant, createTenantAdmin, removeTenantAdmin, updateTenant, deactivateTenant, deleteTenant } from '../controllers/tenantController.js';

const router = express.Router();

router.get('/', protect, superAdminOnly, listTenants);
router.post('/', protect, superAdminOnly, createTenant);
router.post('/:id/admins', protect, superAdminOnly, createTenantAdmin);
router.delete('/:id/admins/:adminId', protect, superAdminOnly, removeTenantAdmin);
router.put('/:id', protect, superAdminOnly, updateTenant);
router.delete('/:id', protect, superAdminOnly, deactivateTenant);
router.delete('/:id/permanent', protect, superAdminOnly, deleteTenant);

export default router;
