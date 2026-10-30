import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { AUTH_COOKIE } from '../src/utils/token.js';

const CSRF = ['X-Requested-With', 'CampusFixAI'];
const stamp = Date.now();
const studentEmail = `authtest.${stamp}.student@example.com`;
const adminEmail = `authtest.${stamp}.admin@example.com`;
const password = 'Test12345';

const post = (path, body) => request(app).post(path).set(...CSRF).send(body);
const removeTestUsers = () => User.deleteMany({ email: /^authtest\./ });

beforeAll(async () => {
  await connectDB();
  await removeTestUsers();
});

afterAll(async () => {
  await removeTestUsers();
  await mongoose.disconnect();
});

describe('registration', () => {
  it('creates a student, hides the hash and sets an HttpOnly cookie', async () => {
    const res = await post('/api/auth/register', {
      name: 'Auth Test',
      email: studentEmail.toUpperCase(),
      password,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(studentEmail);
    expect(res.body.data.user.role).toBe('student');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toContain(`${AUTH_COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('ignores a role sent by the client', async () => {
    const res = await post('/api/auth/register', {
      name: 'Sneaky',
      email: `authtest.${stamp}.sneaky@example.com`,
      password,
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('student');
  });

  it('rejects a duplicate email, even with different letter case', async () => {
    const res = await post('/api/auth/register', {
      name: 'Again',
      email: studentEmail.toUpperCase(),
      password,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a weak password', async () => {
    const res = await post('/api/auth/register', {
      name: 'Weak',
      email: `authtest.${stamp}.weak@example.com`,
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid email', async () => {
    const res = await post('/api/auth/register', {
      name: 'Bad Email',
      email: 'not-an-email',
      password,
    });
    expect(res.status).toBe(400);
  });
});

describe('login', () => {
  it('rejects a wrong password', async () => {
    const res = await post('/api/auth/login', { email: studentEmail, password: 'Wrong12345' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gives the same error for an unknown email', async () => {
    const res = await post('/api/auth/login', {
      email: `authtest.${stamp}.nobody@example.com`,
      password,
    });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('logs in with the right password', async () => {
    const res = await post('/api/auth/login', { email: studentEmail, password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toContain(`${AUTH_COOKIE}=`);
  });
});

describe('protected routes', () => {
  const student = request.agent(app).set(...CSRF);

  beforeAll(async () => {
    await student.post('/api/auth/login').send({ email: studentEmail, password });
  });

  it('returns the current user when logged in', async () => {
    const res = await student.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(studentEmail);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('rejects a request with no cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an expired token', async () => {
    const user = await User.findOne({ email: studentEmail });
    const token = jwt.sign(
      { sub: user.id, tv: user.tokenVersion, exp: Math.floor(Date.now() / 1000) - 60 },
      env.JWT_SECRET
    );
    const res = await request(app).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE}=${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE}=garbage`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const user = await User.findOne({ email: studentEmail });
    const forged = jwt.sign({ sub: user.id, tv: user.tokenVersion }, 'x'.repeat(40));
    const res = await request(app).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE}=${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('blocks a student from admin routes with 403', async () => {
    const res = await student.get('/api/admin/ping');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('blocks a visitor with no login from admin routes with 401', async () => {
    const res = await request(app).get('/api/admin/ping');
    expect(res.status).toBe(401);
  });

  it('lets an admin reach admin routes', async () => {
    await User.create({
      name: 'Auth Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 4),
      role: 'admin',
    });
    const admin = request.agent(app).set(...CSRF);
    await admin.post('/api/auth/login').send({ email: adminEmail, password });
    const res = await admin.get('/api/admin/ping');
    expect(res.status).toBe(200);
  });
});

describe('csrf protection', () => {
  it('rejects a POST without the custom header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: studentEmail, password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_HEADER');
  });

  it('rejects a POST from a foreign origin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set(...CSRF)
      .set('Origin', 'http://evil.example')
      .send({ email: studentEmail, password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_ORIGIN');
  });
});

// Keep this last: logout invalidates every token of the student
describe('logout', () => {
  it('clears the cookie and makes the old token useless', async () => {
    const login = await post('/api/auth/login', { email: studentEmail, password });
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const out = await request(app).post('/api/auth/logout').set(...CSRF).set('Cookie', cookie);
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'][0]).toContain(`${AUTH_COOKIE}=;`);

    const after = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('INVALID_TOKEN');
  });
});