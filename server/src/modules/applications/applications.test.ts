import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { prisma } from '../../db/prisma';

let accessToken: string;
let applicationId: string;
let referenceNo: string;

beforeAll(async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'citizen1@landreg.test', password: 'password123' });

  accessToken = res.body.accessToken as string;
});

afterAll(async () => {
  if (applicationId) {
    await prisma.application.delete({ where: { id: applicationId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('POST /applications', () => {
  it('creates a DRAFT application successfully', async () => {
    const res = await request(app)
      .post('/applications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'DIRECT_REGISTRATION' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.type).toBe('DIRECT_REGISTRATION');
    expect(res.body.reference_no).toBeNull();

    applicationId = res.body.id as string;
  });

  it('returns 400 when type is missing', async () => {
    const res = await request(app)
      .post('/applications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/applications')
      .send({ type: 'DIRECT_REGISTRATION' });

    expect(res.status).toBe(401);
  });
});

describe('POST /applications/:id/submit', () => {
  it('transitions the application to SUBMITTED and generates a reference_no', async () => {
    const res = await request(app)
      .post(`/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('SUBMITTED');
    expect(res.body.reference_no).toMatch(/^APP-\d{4}-\d{4}$/);
    expect(res.body.message).toBe('Application submitted successfully');

    referenceNo = res.body.reference_no as string;
  });

  it('returns 409 when submitting an already-submitted application', async () => {
    const res = await request(app)
      .post(`/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(409);
  });

  it('returns 404 for a non-existent application', async () => {
    const res = await request(app)
      .post('/applications/00000000-0000-0000-0000-000000000000/submit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('GET /applications/:id/track', () => {
  it('returns the current status via reference_no (public — no auth required)', async () => {
    const res = await request(app).get(`/applications/${referenceNo}/track`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.reference_no).toBe(referenceNo);
    expect(res.body).not.toHaveProperty('applicant_id');
  });

  it('returns 404 for an unknown reference number', async () => {
    const res = await request(app).get('/applications/APP-9999-0000/track');

    expect(res.status).toBe(404);
  });
});

describe('GET /applications (officer list)', () => {
  function makeToken(role: string, region: string): string {
    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret) throw new Error('JWT_ACCESS_SECRET not set');
    return jwt.sign({ id: 'test-officer-id', role, region }, secret);
  }

  it('returns 200 for a registrar in fako (has application:read policy)', async () => {
    const token = makeToken('registrar', 'fako');
    const res = await request(app)
      .get('/applications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 403 for a citizen (no application:read policy)', async () => {
    const token = makeToken('citizen', 'fako');
    const res = await request(app)
      .get('/applications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
