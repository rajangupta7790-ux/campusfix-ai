import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

vi.mock('../src/services/geminiService.js', () => ({ analyzeComplaintText: vi.fn() }));

import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Complaint } from '../src/models/Complaint.js';
import { AiError } from '../src/utils/AiError.js';
import { analyzeComplaintText } from '../src/services/geminiService.js';

const CSRF = ['X-Requested-With', 'CampusFixAI'];
const stamp = Date.now();
const password = 'Test12345';

let student, admin, agentStudent, agentAdmin;

const body = (label) => ({
  title: `AI test ${label}`,
  description: 'The socket near the bed is broken and sparks sometimes.',
  hostelBlock: 'C',
  roomNumber: '303',
});

const suggestion = (over = {}) => ({
  category: 'Electrical',
  priority: 'High',
  summary: 'A socket is sparking.',
  ...over,
});

async function makeUser(tag, role) {
  return User.create({
    name: `AITest ${tag}`,
    email: `aitest.${stamp}.${tag}@example.com`,
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

async function createComplaint(label) {
  const res = await agentStudent.post('/api/complaints').send(body(label));
  expect(res.status).toBe(201);
  return res.body.data.complaint.id;
}

// The analysis runs in the background, so wait until it has finished
const waitForAi = (id) =>
  vi.waitFor(
    async () => {
      const c = await Complaint.findById(id).lean();
      if (c.ai.status === 'pending') throw new Error('AI still pending');
      return c;
    },
    { timeout: 5000, interval: 50 }
  );

async function cleanup() {
  const users = await User.find({ email: /^aitest\./ }).select('_id');
  const ids = users.map((u) => u._id);
  await Complaint.deleteMany({ createdBy: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
}

beforeAll(async () => {
  env.AI_ENABLED = true; // this file tests the AI flow (the Gemini layer is mocked)
  await connectDB();
  await User.init();
  await Complaint.init();
  await cleanup();
  student = await makeUser('student', 'student');
  admin = await makeUser('admin', 'admin');
  agentStudent = await loginAgent(student);
  agentAdmin = await loginAgent(admin);
});

beforeEach(() => {
  analyzeComplaintText.mockReset();
});

afterAll(async () => {
  await cleanup();
  await mongoose.disconnect();
});

describe('successful AI analysis', () => {
  it('stores suggestions separately and keeps the final fields at their defaults', async () => {
    analyzeComplaintText.mockResolvedValueOnce(suggestion());
    const id = await createComplaint('success');
    const c = await waitForAi(id);

    expect(c.ai.status).toBe('success');
    expect(c.ai.category).toBe('Electrical');
    expect(c.ai.priority).toBe('High');
    expect(c.ai.summary).toBe('A socket is sparking.');
    expect(c.ai.generatedAt).toBeDefined();
    expect(c.category).toBe('Other'); // final value untouched
    expect(c.priority).toBe('Medium');
    expect(c.reviewedByAdmin).toBe(false);
  });

  it('sends only the title and description to the AI', async () => {
    analyzeComplaintText.mockResolvedValueOnce(suggestion());
    const id = await createComplaint('payload');
    await waitForAi(id);
    expect(analyzeComplaintText).toHaveBeenCalledWith({
      title: body('payload').title,
      description: body('payload').description,
    });
  });

  it('shows the suggestion to an admin but never to the student', async () => {
    analyzeComplaintText.mockResolvedValueOnce(suggestion());
    const id = await createComplaint('visibility');
    await waitForAi(id);

    const asAdmin = await agentAdmin.get(`/api/complaints/${id}`);
    expect(asAdmin.body.data.complaint.ai.summary).toBe('A socket is sparking.');
    const asStudent = await agentStudent.get(`/api/complaints/${id}`);
    expect(asStudent.body.data.complaint.ai).toBeUndefined();
  });

  it('lets the admin override without losing what the AI said', async () => {
    analyzeComplaintText.mockResolvedValueOnce(suggestion());
    const id = await createComplaint('override');
    await waitForAi(id);

    const res = await agentAdmin
      .patch(`/api/admin/complaints/${id}/classification`)
      .send({ category: 'Plumbing', priority: 'Low' });
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.category).toBe('Plumbing');
    expect(res.body.data.complaint.ai.category).toBe('Electrical');
    expect(res.body.data.complaint.ai.priority).toBe('High');
  });

  it('analyzes the new text again after a student edit', async () => {
    analyzeComplaintText.mockResolvedValueOnce(suggestion({ summary: 'First summary.' }));
    const id = await createComplaint('edit');
    await waitForAi(id);

    analyzeComplaintText.mockResolvedValueOnce(suggestion({ summary: 'Second summary.' }));
    const edit = await agentStudent
      .patch(`/api/complaints/${id}`)
      .send({ title: 'AI test edit, changed title' });
    expect(edit.status).toBe(200);

    const c = await vi.waitFor(
      async () => {
        const doc = await Complaint.findById(id).lean();
        if (doc.ai.summary !== 'Second summary.') throw new Error('not yet');
        return doc;
      },
      { timeout: 5000, interval: 50 }
    );
    expect(c.ai.status).toBe('success');
    expect(analyzeComplaintText).toHaveBeenCalledTimes(2);
  });
});

describe('AI failure fallback', () => {
  it('still saves the complaint and marks the AI as failed', async () => {
    analyzeComplaintText.mockRejectedValueOnce(new AiError('TIMEOUT'));
    const id = await createComplaint('timeout'); // createComplaint asserts the 201
    const c = await waitForAi(id);

    expect(c.ai.status).toBe('failed');
    expect(c.ai.errorMessage).toBe('AI request timed out');
    expect(c.ai.category).toBeUndefined();
    expect(c.category).toBe('Other'); // safe defaults
    expect(c.priority).toBe('Medium');
    expect(c.status).toBe('Open');
  });

  it('never stores raw error text from an unexpected error', async () => {
    analyzeComplaintText.mockRejectedValueOnce(new Error('secret-detail api key abc123'));
    const id = await createComplaint('unexpected');
    const c = await waitForAi(id);

    expect(c.ai.status).toBe('failed');
    expect(c.ai.errorMessage).toBe('AI analysis failed');
    expect(JSON.stringify(c.ai)).not.toContain('abc123');
  });
});

describe('admin retry', () => {
  it('recovers a failed analysis', async () => {
    analyzeComplaintText.mockRejectedValueOnce(new AiError('QUOTA'));
    const id = await createComplaint('retry');
    await waitForAi(id);

    analyzeComplaintText.mockResolvedValueOnce(suggestion({ category: 'Wi-Fi', priority: 'Low' }));
    const res = await agentAdmin.post(`/api/admin/complaints/${id}/ai-retry`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.ai.status).toBe('success');
    expect(res.body.data.complaint.ai.category).toBe('Wi-Fi');
  });

  it('returns the complaint with a failed status if the retry also fails', async () => {
    analyzeComplaintText.mockRejectedValueOnce(new AiError('QUOTA'));
    const id = await createComplaint('retry-fails');
    await waitForAi(id);

    analyzeComplaintText.mockRejectedValueOnce(new AiError('UNAVAILABLE'));
    const res = await agentAdmin.post(`/api/admin/complaints/${id}/ai-retry`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.ai.status).toBe('failed');
    expect(res.body.data.complaint.ai.errorMessage).toBe('AI service is unavailable');
  });

  it('does not call the AI again when a suggestion already exists', async () => {
    analyzeComplaintText.mockResolvedValueOnce(suggestion());
    const id = await createComplaint('already');
    await waitForAi(id);
    analyzeComplaintText.mockClear();

    const res = await agentAdmin.post(`/api/admin/complaints/${id}/ai-retry`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AI_ALREADY_DONE');
    expect(analyzeComplaintText).not.toHaveBeenCalled();
  });

  it('blocks a student, rejects a bad id and a missing complaint', async () => {
    const id = await createComplaint('permissions');
    await waitForAi(id).catch(() => {});

    const student403 = await agentStudent.post(`/api/admin/complaints/${id}/ai-retry`).send({});
    expect(student403.status).toBe(403);
    const bad = await agentAdmin.post('/api/admin/complaints/not-an-id/ai-retry').send({});
    expect(bad.status).toBe(400);
    const missing = await agentAdmin
      .post('/api/admin/complaints/000000000000000000000000/ai-retry')
      .send({});
    expect(missing.status).toBe(404);
  });

  it('refuses when AI is switched off', async () => {
    analyzeComplaintText.mockRejectedValueOnce(new AiError('QUOTA'));
    const id = await createComplaint('disabled');
    await waitForAi(id);

    env.AI_ENABLED = false;
    const res = await agentAdmin.post(`/api/admin/complaints/${id}/ai-retry`).send({});
    env.AI_ENABLED = true;
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_DISABLED');
  });
});