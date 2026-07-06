import bcrypt from 'bcryptjs';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import WfhRequest from '../models/WfhRequest.js';
import WfhSettings from '../models/WfhSettings.js';
import { validateEmail, validatePassword } from '../utils/validation.js';

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

export const listTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ name: 1, createdAt: 1 });
    const tenantIds = tenants.map((tenant) => tenant._id);

    const tenantAdmins = await User.find({
      tenant: { $in: tenantIds },
      role: 'tenant_admin',
    }).select('_id tenant name email isActive').sort({ name: 1 });

    const adminsByTenant = tenantAdmins.reduce((acc, admin) => {
      const key = String(admin.tenant);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(admin);
      return acc;
    }, {});

    const payload = tenants.map((tenant) => ({
      ...tenant.toObject(),
      tenantAdmins: adminsByTenant[String(tenant._id)] || [],
    }));

    res.json(payload);
  } catch (err) {
    console.error('[TENANTS] Failed to list tenants:', err);
    res.status(500).json({ message: 'Failed to list tenants' });
  }
};

export const createTenant = async (req, res) => {
  try {
    const { name, slug, isActive = true, adminName, adminEmail, adminPassword } = req.body || {};
    const normalizedSlug = normalizeSlug(slug);

    if (!name || !normalizedSlug) {
      return res.status(400).json({ message: 'Tenant name and slug are required' });
    }

    const duplicateSlug = await Tenant.findOne({ slug: normalizedSlug });
    if (duplicateSlug) {
      return res.status(400).json({ message: 'Tenant slug already exists' });
    }

    const wantsTenantAdmin = adminEmail || adminPassword || adminName;
    if (wantsTenantAdmin && (!adminEmail || !adminPassword || !adminName)) {
      return res.status(400).json({ message: 'adminName, adminEmail and adminPassword are required together' });
    }

    if (wantsTenantAdmin) {
      const emailError = validateEmail(adminEmail);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }

      const passwordError = validatePassword(adminPassword);
      if (passwordError) {
        return res.status(400).json({ message: passwordError });
      }

      const existingAdmin = await User.findOne({ email: String(adminEmail).trim().toLowerCase() });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin email already exists' });
      }
    }

    const tenant = await Tenant.create({
      name: String(name).trim(),
      slug: normalizedSlug,
      isActive: !!isActive,
    });

    let tenantAdmin = null;
    if (wantsTenantAdmin) {
      const hashedPassword = await bcrypt.hash(String(adminPassword), 10);
      tenantAdmin = await User.create({
        tenant: tenant._id,
        name: String(adminName).trim(),
        email: String(adminEmail).trim().toLowerCase(),
        password: hashedPassword,
        role: 'tenant_admin',
      });
    }

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant,
      tenantAdmin: tenantAdmin
        ? {
            _id: tenantAdmin._id,
            name: tenantAdmin.name,
            email: tenantAdmin.email,
            role: tenantAdmin.role,
          }
        : null,
    });
  } catch (err) {
    console.error('[TENANTS] Failed to create tenant:', err);
    res.status(500).json({ message: 'Failed to create tenant' });
  }
};

export const createTenantAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body || {};

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      tenant: tenant._id,
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'tenant_admin',
    });

    return res.status(201).json({
      message: 'Tenant admin created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant,
      },
    });
  } catch (err) {
    console.error('[TENANTS] Failed to create tenant admin:', err);
    return res.status(500).json({ message: 'Failed to create tenant admin' });
  }
};

export const removeTenantAdmin = async (req, res) => {
  try {
    const { id, adminId } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const admin = await User.findOne({
      _id: adminId,
      tenant: tenant._id,
      role: 'tenant_admin',
    });

    if (!admin) {
      return res.status(404).json({ message: 'Tenant admin not found' });
    }

    if (String(admin._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot remove your own tenant-admin account' });
    }

    await admin.deleteOne();

    return res.json({
      message: 'Tenant admin removed successfully',
      removedAdminId: adminId,
      tenantId: id,
    });
  } catch (err) {
    console.error('[TENANTS] Failed to remove tenant admin:', err);
    return res.status(500).json({ message: 'Failed to remove tenant admin' });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, isActive } = req.body || {};
    const tenant = await Tenant.findById(id);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (name !== undefined) {
      tenant.name = String(name).trim();
    }

    if (slug !== undefined) {
      const normalizedSlug = normalizeSlug(slug);
      if (!normalizedSlug) {
        return res.status(400).json({ message: 'Tenant slug cannot be empty' });
      }

      const duplicateSlug = await Tenant.findOne({ slug: normalizedSlug, _id: { $ne: tenant._id } });
      if (duplicateSlug) {
        return res.status(400).json({ message: 'Tenant slug already exists' });
      }
      tenant.slug = normalizedSlug;
    }

    if (isActive !== undefined) {
      tenant.isActive = !!isActive;
    }

    await tenant.save();
    res.json({ message: 'Tenant updated successfully', tenant });
  } catch (err) {
    console.error('[TENANTS] Failed to update tenant:', err);
    res.status(500).json({ message: 'Failed to update tenant' });
  }
};

export const deactivateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    tenant.isActive = false;
    await tenant.save();
    res.json({ message: 'Tenant deactivated successfully', tenant });
  } catch (err) {
    console.error('[TENANTS] Failed to deactivate tenant:', err);
    res.status(500).json({ message: 'Failed to deactivate tenant' });
  }
};

export const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Delete all associated data
    await User.deleteMany({ tenant: id });
    await Holiday.deleteMany({ tenant: id });
    await WfhRequest.deleteMany({ tenant: id });
    await WfhSettings.deleteMany({ tenant: id });

    // Delete the tenant
    await Tenant.deleteOne({ _id: id });

    res.json({ message: 'Tenant deleted successfully' });
  } catch (err) {
    console.error('[TENANTS] Failed to delete tenant:', err);
    res.status(500).json({ message: 'Failed to delete tenant' });
  }
};
