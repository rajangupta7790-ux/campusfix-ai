import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { STATUSES, CATEGORIES, PRIORITIES } from '../src/utils/constants.js';

const CSRF = ['X-Requested-With', 'CampusFixAI'];
const stamp = Date.now();
const token = `Zq${stamp}`; // unique word, so searches find only our test data
const password = 'Test12345';
const FAKE_ID = '000000000000000000000000';

let student, admin, admin2;
let agentStudent, agentAdmin;

async function makeUser(tag, role) {
  return User.create({
    name: `ATest ${tag}`,
    email: `atest.${stamp}.${tag}@example.com`,
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

async function newComplaint(label) {
  const res = await agentStudent.post('/api/complaints').send({
    title: `${token} ${label}`,
    description: 'The socket near the bed is broken and sparks sometimes.',
    hostelBlock: 'B',
    roomNumber: '202',
  });
  expect(res.status).toBe(201);
  return res.body.data.complaint;
}

async function cleanup() {
  const users = await User.find({ email: /^atest\./ }).select('_id');
  const ids = users.map((u) => u._id);
  await Complaint.deleteMany({ createdBy: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
}

beforeAll(async () => {
  await connectDB();
  await User.init();
  await Complaint.init();
  await cleanup();
  student = await makeUser('student', 'student');
  admin = await makeUser('admin', 'admin');
  admin2 = await makeUser('admin2', 'admin');
  agentStudent = await loginAgent(student);
  agentAdmin = await loginAgent(admin);
});

afterAll(async () => {
  await cleanup();
  await mongoose.disconnect();
});

describe('access control', () => {
  it('blocks a student from every admin route with 403', async () => {
    expect((await agentStudent.get('/api/admin/complaints')).status).toBe(403);
    expect((await agentStudent.get('/api/admin/stats')).status).toBe(403);
    expect((await agentStudent.get('/api/admin/assignees')).status).toBe(403);
    const res = await agentStudent
      .patch(`/api/admin/complaints/${FAKE_ID}/status`)
      .send({ status: 'Assigned' });
    expect(res.status).toBe(403);
  });

  it('blocks a visitor with 401', async () => {
    const res = await request(app).get('/api/admin/complaints');
    expect(res.status).toBe(401);
  });
});

describe('admin list, filters and search', () => {
  let id;

  beforeAll(async () => {
    id = (await newComplaint('list me')).id;
  });

  it('lists complaints with AI and owner details', async () => {
    const res = await agentAdmin.get(`/api/admin/complaints?search=${token}`);
    expect(res.status).toBe(200);
    const found = res.body.data.complaints.find((c) => c.id === id);
    expect(found).toBeDefined();
    expect(found.ai.status).toBe('pending');
    expect(found.createdBy.email).toBe(student.email);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('treats special characters as plain text', async () => {
    const res = await agentAdmin.get('/api/admin/complaints?search=.*');
    expect(res.status).toBe(200);
    expect(res.body.data.complaints.map((c) => c.id)).not.toContain(id);
  });

  it('rejects a repeated search parameter', async () => {
    const res = await agentAdmin.get('/api/admin/complaints?search=a&search=b');
    expect(res.status).toBe(400);
  });

  it('rejects a page size above the maximum', async () => {
    const res = await agentAdmin.get('/api/admin/complaints?limit=100');
    expect(res.status).toBe(400);
  });

  it('rejects an unknown category filter', async () => {
    const res = await agentAdmin.get('/api/admin/complaints?category=Food');
    expect(res.status).toBe(400);
  });
});

describe('classification override', () => {
  let id;

  beforeAll(async () => {
    id = (await newComplaint('classify me')).id;
  });

  it('lets an admin set category and priority and marks it reviewed', async () => {
    const res = await agentAdmin
      .patch(`/api/admin/complaints/${id}/classification`)
      .send({ category: 'Electrical', priority: 'High' });
    expect(res.status).toBe(200);
    const c = res.body.data.complaint;
    expect(c.category).toBe('Electrical');
    expect(c.priority).toBe('High');
    expect(c.reviewedByAdmin).toBe(true);
  });

  it('is found by the matching filters and not by others', async () => {
    const match = await agentAdmin.get(
      `/api/admin/complaints?category=Electrical&priority=High&search=${token}`
    );
    expect(match.body.data.complaints.map((c) => c.id)).toContain(id);
    const other = await agentAdmin.get(`/api/admin/complaints?category=Plumbing&search=${token}`);
    expect(other.body.data.complaints.map((c) => c.id)).not.toContain(id);
  });

  it('stops the student from editing a reviewed complaint', async () => {
    const res = await agentStudent.patch(`/api/complaints/${id}`).send({ title: 'Changed my mind' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_EDITABLE');
  });

  it('rejects an empty body and an invalid value', async () => {
    const empty = await agentAdmin.patch(`/api/admin/complaints/${id}/classification`).send({});
    expect(empty.status).toBe(400);
    const bad = await agentAdmin
      .patch(`/api/admin/complaints/${id}/classification`)
      .send({ category: 'Food' });
    expect(bad.status).toBe(400);
  });

  it('blocks a student from classifying', async () => {
    const res = await agentStudent
      .patch(`/api/admin/complaints/${id}/classification`)
      .send({ priority: 'Low' });
    expect(res.status).toBe(403);
  });
});

describe('assignment', () => {
  let id;

  beforeAll(async () => {
    id = (await newComplaint('assign me')).id;
  });

  const assignTo = (agent, assigneeId) =>
    agent.patch(`/api/admin/complaints/${id}/assign`).send({ assigneeId: String(assigneeId) });

  it('rejects a student as assignee', async () => {
    const res = await assignTo(agentAdmin, student._id);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNEE');
  });

  it('rejects an unknown user as assignee', async () => {
    const res = await assignTo(agentAdmin, FAKE_ID);
    expect(res.status).toBe(400);
  });

  it('blocks a student from assigning', async () => {
    const res = await assignTo(agentStudent, admin._id);
    expect(res.status).toBe(403);
  });

  it('assigns, moves Open to Assigned and records who did it', async () => {
    const res = await assignTo(agentAdmin, admin._id);
    expect(res.status).toBe(200);
    const c = res.body.data.complaint;
    expect(c.status).toBe('Assigned');
    expect(c.assignedTo.name).toBe(admin.name);
    const detail = await agentAdmin.get(`/api/complaints/${id}`);
    const history = detail.body.data.complaint.statusHistory;
    expect(history).toHaveLength(2);
    expect(history[1].status).toBe('Assigned');
    expect(history[1].changedBy.name).toBe(admin.name);
  });

  it('allows reassignment without changing the status', async () => {
    const res = await assignTo(agentAdmin, admin2._id);
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.status).toBe('Assigned');
    expect(res.body.data.complaint.assignedTo.name).toBe(admin2.name);
  });
});

describe('status workflow', () => {
  let id;

  beforeAll(async () => {
    id = (await newComplaint('workflow')).id;
  });

  const setStatus = (status, note) =>
    agentAdmin.patch(`/api/admin/complaints/${id}/status`).send({ status, note });

  it('rejects skipping a step', async () => {
    const res = await setStatus('In Progress');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('needs an assignee before leaving Open', async () => {
    const res = await setStatus('Assigned');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NEEDS_ASSIGNEE');
  });

  it('rejects an invalid status value and a student caller', async () => {
    expect((await setStatus('Done')).status).toBe(400);
    const res = await agentStudent
      .patch(`/api/admin/complaints/${id}/status`)
      .send({ status: 'Assigned' });
    expect(res.status).toBe(403);
  });

  it('moves forward step by step and sets resolvedAt', async () => {
    const a = await agentAdmin
      .patch(`/api/admin/complaints/${id}/assign`)
      .send({ assigneeId: String(admin._id) });
    expect(a.status).toBe(200);

    expect((await setStatus('Resolved')).status).toBe(409); // cannot skip

    const p = await setStatus('In Progress', 'Electrician is on the way');
    expect(p.status).toBe(200);
    expect(p.body.data.complaint.status).toBe('In Progress');

    const r = await setStatus('Resolved');
    expect(r.status).toBe(200);
    expect(r.body.data.complaint.resolvedAt).not.toBeNull();
  });

  it('rejects setting the same status again', async () => {
    const res = await setStatus('Resolved');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('lets an admin step back and clears resolvedAt', async () => {
    const res = await setStatus('In Progress');
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.resolvedAt).toBeNull();
  });

  it('does not allow assigning a resolved complaint', async () => {
    expect((await setStatus('Resolved')).status).toBe(200);
    const res = await agentAdmin
      .patch(`/api/admin/complaints/${id}/assign`)
      .send({ assigneeId: String(admin2._id) });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_RESOLVED');
  });

  it('shows the student the full history, without AI details', async () => {
    const res = await agentStudent.get(`/api/complaints/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.statusHistory).toHaveLength(6);
    expect(res.body.data.complaint.ai).toBeUndefined();
  });

  it('returns 404 for a complaint that does not exist', async () => {
    const res = await agentAdmin
      .patch(`/api/admin/complaints/${FAKE_ID}/status`)
      .send({ status: 'Assigned' });
    expect(res.status).toBe(404);
  });
});

describe('assignees and statistics', () => {
  it('lists admins for the assign dropdown', async () => {
    const res = await agentAdmin.get('/api/admin/assignees');
    expect(res.status).toBe(200);
    const emails = res.body.data.assignees.map((a) => a.email);
    expect(emails).toContain(admin.email);
    expect(emails).not.toContain(student.email);
  });

  it('returns complete statistics', async () => {
    const res = await agentAdmin.get('/api/admin/stats');
    expect(res.status).toBe(200);
    const s = res.body.data.stats;
    expect(s.total).toBeGreaterThanOrEqual(1);
    expect(Object.keys(s.byStatus)).toEqual(STATUSES);
    expect(Object.keys(s.byCategory)).toEqual(CATEGORIES);
    expect(Object.keys(s.byPriority)).toEqual(PRIORITIES);
    expect(s.daily).toHaveLength(14);
    expect(typeof s.unassigned).toBe('number');
    expect(typeof s.unreviewed).toBe('number');
  });

  it('counts add up to the total', async () => {
    const s = (await agentAdmin.get('/api/admin/stats')).body.data.stats;
    const sum = Object.values(s.byStatus).reduce((a, b) => a + b, 0);
    expect(sum).toBe(s.total);
  });
});