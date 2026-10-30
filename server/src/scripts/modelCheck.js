import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Complaint } from '../models/Complaint.js';

async function run() {
  await connectDB();

  // Clean up any leftovers from a previous run
  await User.deleteMany({ email: 'modelcheck@example.com' });

  // 1. Create a test user (fake hash, real hashing comes with auth)
  const user = await User.create({
    name: 'Model Check',
    email: 'ModelCheck@Example.com',
    passwordHash: 'not-a-real-hash',
  });
  console.log('1. User saved. email:', user.email, '| role:', user.role);

  // 2. The hash must be hidden by default
  const fetched = await User.findById(user._id);
  console.log('2. passwordHash hidden by default:', fetched.passwordHash === undefined);

  // 3. A duplicate email must fail
  try {
    await User.create({ name: 'Dup', email: 'modelcheck@example.com', passwordHash: 'x' });
    console.log('3. FAIL: duplicate was allowed');
  } catch (e) {
    console.log('3. Duplicate email blocked, code:', e.code);
  }

  // 4. Create a complaint with a status history entry
  const complaint = await Complaint.create({
    title: 'Leaking tap',
    description: 'The tap in the washroom is leaking all day.',
    hostelBlock: 'A',
    roomNumber: '101',
    createdBy: user._id,
    statusHistory: [{ status: 'Open', changedBy: user._id, note: 'Created' }],
  });
  console.log(
    '4. Complaint saved. status:', complaint.status,
    '| category:', complaint.category,
    '| priority:', complaint.priority,
    '| ai.status:', complaint.ai.status
  );

  // 5. An invalid category must be rejected by Mongoose
  try {
    await Complaint.create({
      title: 'Bad', description: 'Bad', hostelBlock: 'A', roomNumber: '1',
      createdBy: user._id, category: 'Food',
    });
    console.log('5. FAIL: invalid category was allowed');
  } catch (e) {
    console.log('5. Invalid category blocked:', e.name);
  }

  // 6. Populate shows the owner's name from the reference
  const populated = await Complaint.findById(complaint._id).populate('createdBy', 'name email');
  console.log('6. Populated owner:', populated.createdBy.name);

  // Clean up test data
  await Complaint.deleteMany({ createdBy: user._id });
  await User.deleteMany({ email: 'modelcheck@example.com' });
  console.log('Cleanup done.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Model check failed:', err.message);
  process.exit(1);
});