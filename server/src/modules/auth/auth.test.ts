import request from 'supertest';
import express from 'express';
import app from '../../app';
import { authMiddleware } from '../../middleware/auth';
import { clearAttempts } from './auth.controller';
import { prisma } from '../../db/prisma';

afterAll(() => prisma.$disconnect());

const ADMIN_EMAIL = 'admin@landreg.test';
const LOCKOUT_EMAIL = 'no-such-user@lockout.test';

// Mini app used only to exercise the middleware in isolation
const guardedApp = express();
guardedApp.use(express.json());
guardedApp.get('/protected', authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

beforeEach(() => {
  clearAttempts(ADMIN_EMAIL);
  clearAttempts(LOCKOUT_EMAIL);
});

describe('POST /auth/login', () => {
  it('returns 200 with accessToken, refreshToken and user (no password) on valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toBeDefined();
    expect(res.body.user).not.toHaveProperty('hashed_password');
    expect(res.body.user.role).toBe('admin');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'definitely-wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 429 after 5 consecutive failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/auth/login')
        .send({ email: LOCKOUT_EMAIL, password: 'wrong' });
    }

    const res = await request(app)
      .post('/auth/login')
      .send({ email: LOCKOUT_EMAIL, password: 'wrong' });

    expect(res.status).toBe(429);
  });
});

describe('authMiddleware', () => {
  it('returns 401 when the Authorization header is absent', async () => {
    const res = await request(guardedApp).get('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is malformed', async () => {
    const res = await request(guardedApp)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
