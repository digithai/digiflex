import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import WfhRequest from '../models/WfhRequest.js';
import WfhSettings from '../models/WfhSettings.js';

export const DEFAULT_TENANT_NAME = 'Digithai';
export const DEFAULT_TENANT_SLUG = 'digithai';

export const getTenantFilter = (tenantId) => ({ tenant: tenantId });

export const resolveTenantFromRequest = async (req) => {
  if (req.user?.tenant?._id || req.user?.tenant) {
    return req.user.tenant;
  }

  const tenantSlug = req.body?.tenantSlug || req.query?.tenantSlug || req.headers['x-tenant-slug'];
  const tenantId = req.body?.tenantId || req.query?.tenantId || req.headers['x-tenant-id'];
  if (tenantId) {
    return Tenant.findOne({ _id: tenantId, isActive: true });
  }
  if (!tenantSlug) {
    return null;
  }

  return Tenant.findOne({ slug: String(tenantSlug).trim().toLowerCase(), isActive: true });
};

export const ensureDefaultTenant = async () => {
  let tenant = await Tenant.findOne({ slug: DEFAULT_TENANT_SLUG });
  if (!tenant) {
    tenant = await Tenant.create({
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
      isActive: true,
    });
  }

  await Promise.all([
    User.updateMany({ tenant: { $exists: false } }, { $set: { tenant: tenant._id } }),
    Holiday.updateMany({ tenant: { $exists: false } }, { $set: { tenant: tenant._id } }),
    WfhRequest.updateMany({ tenant: { $exists: false } }, { $set: { tenant: tenant._id } }),
    WfhSettings.updateMany({ tenant: { $exists: false } }, { $set: { tenant: tenant._id } }),
  ]);

  return tenant;
};
