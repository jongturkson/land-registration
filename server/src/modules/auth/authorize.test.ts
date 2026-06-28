import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { prisma } from '../../db/prisma';

afterAll(() => prisma.$disconnect());

function makeToken(role: string, region: string): string {
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) throw new Error('JWT_ACCESS_SECRET not set');
  return jwt.sign({ id: 'test-user-id', role, region }, secret);
}

describe('GET /ping-protected (RBAC with domains)', () => {
  it('allows a registrar in the fako region (200)', async () => {
    const token = makeToken('registrar', 'fako');
    const res = await request(app)
      .get('/ping-protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('blocks a citizen in the fako region with 403', async () => {
    const token = makeToken('citizen', 'fako');
    const res = await request(app)
      .get('/ping-protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
