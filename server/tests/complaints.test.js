import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';

const CSRF = ['X-Requested-With', 'CampusFixAI'];
const stamp = Date.now();
const password = 'Test12345';
const valid = {
  title: 'Leaking tap in washroom',
  description: 'The tap in the washroom has been leaking since morning.',
  hostelBlock: 'A',
  roomNumber: '101',
};

let studentA, studentB, adminUser;
let agentA, agentB, agentAdmin;
let complaintId;

async function makeUser(tag, role) {
  return User.create({
    name: `CTest ${tag}`,
    email: `ctest.${stamp}.${tag}@example.com`,
    passwordHash: await bcrypt.hash(password, 4),
    role,
  });
}

async function loginAgent(user) {
  const agent = request.agent(app).set(...CSRF);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password });
  expect(res.status).toBe(200);
  return agent;
}

async function createComplaint(agent = agentA, extra = {}) {
  const res = await agent.post('/api/complaints').send({ ...valid, ...extra });
  expect(res.status).toBe(201);
  return res.body.data.complaint;
}

async function cleanup() {
  const users = await User.find({ email: /^ctest\./ }).select('_id');
  const ids = users.map((u) => u._id);
  await Complaint.deleteMany({ createdBy: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
}

beforeAll(async () => {
  await connectDB();
  await User.init();
  await Complaint.init(); // makes sure indexes exist
  await cleanup();
  studentA = await makeUser('studentA', 'student');
  studentB = await makeUser('studentB', 'student');
  adminUser = await makeUser('admin', 'admin');
  agentA = await loginAgent(studentA);
  agentB = await loginAgent(studentB);
  agentAdmin = await loginAgent(adminUser);
});

afterAll(async () => {
  await cleanup();
  await mongoose.disconnect();
});

describe('create complaint', () => {
  it('creates an Open complaint and ignores protected fields', async () => {
    const res = await agentA.post('/api/complaints').send({
      ...valid,
      status: 'Resolved',
      category: 'Electrical',
      priority: 'High',
      assignedTo: String(adminUser._id),
      createdBy: String(studentB._id),
      reviewedByAdmin: true,
    });
    expect(res.status).toBe(201);
    const c = res.body.data.complaint;
    complaintId = c.id;
    expect(c.status).toBe('Open');
    expect(c.category).toBe('Other');
    expect(c.priority).toBe('Medium');
    expect(c.assignedTo).toBeNull();
    expect(c.statusHistory).toHaveLength(1);
    // Students never see AI or internal fields
    expect(c.ai).toBeUndefined();
    expect(c.createdBy).toBeUndefined();
    expect(c.reviewedByAdmin).toBeUndefined();

    const saved = await Complaint.findById(complaintId);
    expect(String(saved.createdBy)).toBe(String(studentA._id));
    expect(saved.reviewedByAdmin).toBe(false);
  });

  it('rejects a too-short title', async () => {
    const res = await agentA.post('/api/complaints').send({ ...valid, title: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('blocks an admin from creating complaints', async () => {
    const res = await agentAdmin.post('/api/complaints').send(valid);
    expect(res.status).toBe(403);
  });

  it('blocks a visitor who is not logged in', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set(...CSRF)
      .send(valid);
    expect(res.status).toBe(401);
  });
});

describe('list own complaints', () => {
  it('returns only the student own complaints, with pagination', async () => {
    const res = await agentA.get('/api/complaints/mine?limit=5');
    expect(res.status).toBe(200);
    const ids = res.body.data.complaints.map((c) => c.id);
    expect(ids).toContain(complaintId);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination.limit).toBe(5);
  });

  it('shows another student nothing of it', async () => {
    const res = await agentB.get('/api/complaints/mine');
    expect(res.status).toBe(200);
    expect(res.body.data.complaints).toHaveLength(0);
  });

  it('rejects a page size above the maximum', async () => {
    const res = await agentA.get('/api/complaints/mine?limit=1000');
    expect(res.status).toBe(400);
  });

  it('rejects an unknown status filter', async () => {
    const res = await agentA.get('/api/complaints/mine?status=Done');
    expect(res.status).toBe(400);
  });

  it('filters by status', async () => {
    const res = await agentA.get('/api/complaints/mine?status=Resolved');
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('blocks an admin from the student list', async () => {
    const res = await agentAdmin.get('/api/complaints/mine');
    expect(res.status).toBe(403);
  });
});

describe('get one complaint', () => {
  it('lets the owner read it, with its history', async () => {
    const res = await agentA.get(`/api/complaints/${complaintId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.statusHistory).toHaveLength(1);
    expect(res.body.data.complaint.ai).toBeUndefined();
  });

  it('hides it from another student with 404', async () => {
    const res = await agentB.get(`/api/complaints/${complaintId}`);
    expect(res.status).toBe(404);
  });

  it('lets an admin read it, including AI and owner details', async () => {
    const res = await agentAdmin.get(`/api/complaints/${complaintId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.ai.status).toBe('pending');
    expect(res.body.data.complaint.createdBy.email).toBe(studentA.email);
    expect(res.body.data.complaint.reviewedByAdmin).toBe(false);
  });

  it('rejects a malformed id with 400', async () => {
    const res = await agentA.get('/api/complaints/not-an-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await agentA.get('/api/complaints/000000000000000000000000');
    expect(res.status).toBe(404);
  });
});

describe('edit and delete own complaint', () => {
  it('lets the owner edit while Open, and marks AI as out of date', async () => {
    const res = await agentA
      .patch(`/api/complaints/${complaintId}`)
      .send({ title: 'Leaking tap near room 101' });
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.title).toBe('Leaking tap near room 101');
    const saved = await Complaint.findById(complaintId);
    expect(saved.ai.status).toBe('pending');
  });

  it('cannot change the status through the edit route', async () => {
    const res = await agentA.patch(`/api/complaints/${complaintId}`).send({ status: 'Resolved' });
    expect(res.status).toBe(400); // the field is stripped, so nothing is left to update
  });

  it('does not let another student edit or delete it', async () => {
    const edit = await agentB.patch(`/api/complaints/${complaintId}`).send({ title: 'Hacked title' });
    expect(edit.status).toBe(404);
    const del = await agentB.delete(`/api/complaints/${complaintId}`);
    expect(del.status).toBe(404);
  });

  it('refuses edit and delete once the complaint is being handled', async () => {
    const c = await createComplaint();
    await Complaint.updateOne({ _id: c.id }, { status: 'Assigned' }); // simulate an admin
    const edit = await agentA.patch(`/api/complaints/${c.id}`).send({ title: 'Too late to edit' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('NOT_EDITABLE');
    const del = await agentA.delete(`/api/complaints/${c.id}`);
    expect(del.status).toBe(409);
  });

  it('lets the owner withdraw an Open complaint', async () => {
    const c = await createComplaint();
    const del = await agentA.delete(`/api/complaints/${c.id}`);
    expect(del.status).toBe(200);
    const after = await agentA.get(`/api/complaints/${c.id}`);
    expect(after.status).toBe(404);
  });
});