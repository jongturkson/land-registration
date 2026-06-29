import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type AttemptEntry = { count: number; resetAt: number };
export const attemptStore = new Map<string, AttemptEntry>();

export function clearAttempts(email: string): void {
  attemptStore.delete(email);
}

function isLocked(email: string): boolean {
  const entry = attemptStore.get(email);
  if (!entry) return false;
  if (Date.now() >= entry.resetAt) {
    attemptStore.delete(email);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(email: string): void {
  const now = Date.now();
  const entry = attemptStore.get(email);
  if (entry && now < entry.resetAt) {
    entry.count += 1;
  } else {
    attemptStore.set(email, { count: 1, resetAt: now + WINDOW_MS });
  }
}

function signAccess(payload: { id: string; role: string; region: string }): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: '15m' });
}

function signRefresh(id: string): string {
  return jwt.sign({ id }, env.jwtRefreshSecret, { expiresIn: '7d' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.flatten() });
    return;
  }

  const { email, password } = parse.data;

  if (isLocked(email)) {
    res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
    return;
  }

  const user = await prisma.user.findFirst({ where: { email } });

  if (!user) {
    recordFailure(email);
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await argon2.verify(user.hashed_password, password);
  if (!valid) {
    recordFailure(email);
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  attemptStore.delete(email);

  const { hashed_password: _pw, ...safeUser } = user;
  const accessToken = signAccess({ id: user.id, role: user.role, region: user.region });
  const refreshToken = signRefresh(user.id);

  res.json({ accessToken, refreshToken, user: safeUser });
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  region: z.string().min(1, 'Region is required'),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const { email, password, full_name, phone, region } = parse.data;

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'An account with this email already exists' });
    return;
  }

  const hashed_password = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      hashed_password,
      full_name,
      phone: phone ?? null,
      region,
      role: 'citizen',
    },
  });

  const { hashed_password: _pw, ...safeUser } = user;
  const accessToken = signAccess({ id: user.id, role: user.role, region: user.region });
  const refreshToken = signRefresh(user.id);

  res.status(201).json({ accessToken, refreshToken, user: safeUser });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  const { refreshToken } = parse.data;

  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as jwt.JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload['id'] as string } });
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const accessToken = signAccess({ id: user.id, role: user.role, region: user.region });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
}
