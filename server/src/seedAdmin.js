import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import './config/env.js'; // loads and validates .env
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { ROLES } from './utils/constants.js';
import { emailSchema, passwordSchema } from './validators/auth.js';

const name = process.env.SEED_ADMIN_NAME || 'Campus Admin';
const email = emailSchema.safeParse(process.env.SEED_ADMIN_EMAIL);
const password = passwordSchema.safeParse(process.env.SEED_ADMIN_PASSWORD);

if (!email.success || !password.success) {
  console.error('Set a valid SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in server/.env');
  console.error('The password needs 8 or more characters, with a letter and a number.');
  process.exit(1);
}

async function run() {
  await connectDB();

  const existing = await User.findOne({ email: email.data });
  if (existing) {
    if (existing.role === ROLES.ADMIN) {
      console.log('Admin already exists:', existing.email);
    } else {
      existing.role = ROLES.ADMIN;
      await existing.save();
      console.log('Existing user promoted to admin:', existing.email);
    }
  } else {
    const passwordHash = await bcrypt.hash(password.data, 12);
    await User.create({ name, email: email.data, passwordHash, role: ROLES.ADMIN });
    console.log('Admin created:', email.data);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});