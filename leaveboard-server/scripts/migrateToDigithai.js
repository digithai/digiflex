import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import WfhRequest from '../models/WfhRequest.js';
import WfhSettings from '../models/WfhSettings.js';

dotenv.config();

const DIGITHAI_TENANT_NAME = 'Digithai';
const DIGITHAI_TENANT_SLUG = 'digithai';

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[migrate-to-digithai] Connected to MongoDB');
  console.log('[migrate-to-digithai] Database:', process.env.MONGO_URI.split('/').pop());

  // Step 1: Create default tenant Digithai if not present
  let tenant = await Tenant.findOne({ slug: DIGITHAI_TENANT_SLUG });
  if (!tenant) {
    tenant = await Tenant.create({
      name: DIGITHAI_TENANT_NAME,
      slug: DIGITHAI_TENANT_SLUG,
      isActive: true,
    });
    console.log(`[migrate-to-digithai] Created default tenant ${tenant.name} (${tenant._id})`);
  } else {
    console.log(`[migrate-to-digithai] Using existing tenant ${tenant.name} (${tenant._id})`);
  }

  const targetTenantId = tenant._id;

  // Step 2: Convert admins to tenant admins and assign to Digithai
  const adminToTenantAdmin = await User.updateMany(
    { role: 'admin' },
    { $set: { role: 'tenant_admin', tenant: targetTenantId } }
  );
  console.log('[migrate-to-digithai] Admins converted to tenant admins and assigned to Digithai:', adminToTenantAdmin.modifiedCount);

  // Step 3: Assign all non-superadmin users to Digithai
  const allUsersToDigithai = await User.updateMany(
    { role: { $nin: ['superadmin'] } },
    { $set: { tenant: targetTenantId } }
  );
  console.log('[migrate-to-digithai] All non-superadmin users assigned to Digithai:', allUsersToDigithai.modifiedCount);

  // Step 6: Move related data to Digithai
  const holidaysToDigithai = await Holiday.updateMany(
    {
      $or: [
        { tenant: { $exists: false } },
        { tenant: null },
      ],
    },
    { $set: { tenant: targetTenantId } }
  );
  console.log('[migrate-to-digithai] Holidays assigned to Digithai:', holidaysToDigithai.modifiedCount);

  const requestsToDigithai = await WfhRequest.updateMany(
    {
      $or: [
        { tenant: { $exists: false } },
        { tenant: null },
      ],
    },
    { $set: { tenant: targetTenantId } }
  );
  console.log('[migrate-to-digithai] WFH requests assigned to Digithai:', requestsToDigithai.modifiedCount);

  const settingsToDigithai = await WfhSettings.updateMany(
    {
      $or: [
        { tenant: { $exists: false } },
        { tenant: null },
      ],
    },
    { $set: { tenant: targetTenantId } }
  );
  console.log('[migrate-to-digithai] WFH settings assigned to Digithai:', settingsToDigithai.modifiedCount);

  // Step 7: Handle any invalid roles by setting them to 'user'
  const invalidRoles = await User.updateMany(
    { role: { $nin: ['superadmin', 'tenant_admin', 'approver', 'user'] } },
    { $set: { role: 'user', tenant: targetTenantId } }
  );
  console.log('[migrate-to-digithai] Invalid roles converted to user:', invalidRoles.modifiedCount);

  console.log('[migrate-to-digithai] Migration completed successfully');
};

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('[migrate-to-digithai] Disconnected');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrate-to-digithai] Failed:', err);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
