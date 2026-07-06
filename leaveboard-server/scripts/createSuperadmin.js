import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import User from '../models/User.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  console.log('[create-superadmin] Superadmin User Creation');
  console.log('[create-superadmin] ==============================\n');

  const name = await question('Enter superadmin name: ');
  const email = await question('Enter superadmin email: ');
  const password = await question('Enter superadmin password: ');

  if (!name || !email || !password) {
    console.error('[create-superadmin] Error: All fields are required');
    rl.close();
    process.exit(1);
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[create-superadmin] Connected to MongoDB');
  console.log('[create-superadmin] Database:', process.env.MONGO_URI.split('/').pop());

  // Check if superadmin already exists
  const existingSuperadmin = await User.findOne({ email, role: 'superadmin' });
  if (existingSuperadmin) {
    console.log('[create-superadmin] Superadmin already exists:', email);
    console.log('[create-superadmin] Skipping creation');
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create superadmin user
  const superadmin = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'superadmin',
    position: 'Super Administrator',
    team: 'Management',
    office: 'HQ',
    country: 'US',
    wfhWeekly: 1,
    leaveCounts: { sickLeave: 15, timeOff: 15 },
    employmentDate: new Date(),
    isActive: true,
    tenant: null, // Superadmins don't belong to a tenant
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('[create-superadmin] Superadmin created successfully');
  console.log('[create-superadmin] Name:', name);
  console.log('[create-superadmin] Email:', email);
  console.log('[create-superadmin] ID:', superadmin._id);
};

run()
  .then(async () => {
    rl.close();
    await mongoose.disconnect();
    console.log('[create-superadmin] Disconnected');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[create-superadmin] Failed:', err);
    rl.close();
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
