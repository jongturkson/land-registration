import crypto from 'crypto';
import { Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';

// ─── Statutory role catalogue ───────────────────────────────────────────────
// The Admin provisions accounts using the statutory office names; internally
// they map to the role strings used by the Casbin policy and the workflow
// state machine. NOTARY and RECEIVER have no processing permissions yet —
// they exist so their accounts can be provisioned ahead of those modules.

export const STATUTORY_ROLES = {
  SDO: 'sub_divisional_officer',
  SURVEYOR: 'surveyor',
  REGIONAL_DELEGATE: 'regional_delegate',
  CONSERVATEUR: 'registrar',
  NOTARY: 'notary',
  RECEIVER: 'receiver',
} as const;

const CreateOfficialSchema = z.object({
  email: z.string().email('A valid email is required'),
  full_name: z.string().min(1, 'Full name is required'),
  department: z.string().min(1, 'Department is required'),
  role: z.enum(['SDO', 'SURVEYOR', 'REGIONAL_DELEGATE', 'CONSERVATEUR', 'NOTARY', 'RECEIVER']),
});

const SetStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  region: true,
  department: true,
  status: true,
  phone: true,
} as const;

// POST /admin/users — provision a new official account.
// A temporary password is generated and returned ONCE in the response; the
// Admin conveys it to the official out-of-band. It is never stored in clear.
export async function createOfficial(req: Request, res: Response): Promise<void> {
  const parse = CreateOfficialSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const { email, full_name, department, role } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'An account with this email already exists' });
    return;
  }

  const temporaryPassword = crypto.randomBytes(9).toString('base64url'); // 12 chars
  const hashed_password = await argon2.hash(temporaryPassword);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        full_name,
        department,
        role: STATUTORY_ROLES[role],
        region: req.user!.region, // officials are provisioned into the admin's region
        hashed_password,
        status: 'ACTIVE',
      },
      select: SAFE_USER_SELECT,
    });

    await appendLog(
      req.user!.id,
      req.user!.role,
      'USER_PROVISIONED',
      'USER',
      created.id,
      { email, full_name, department, statutory_role: role, internal_role: created.role },
      tx,
    );

    return created;
  });

  res.status(201).json({
    message: 'Official account provisioned',
    user,
    temporary_password: temporaryPassword,
  });
}

// GET /admin/users — all official accounts (citizens use the public portal
// and are not managed here)
export async function listOfficials(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: { not: 'citizen' } },
    select: SAFE_USER_SELECT,
    orderBy: [{ role: 'asc' }, { full_name: 'asc' }],
  });
  res.json(users);
}

// PUT /admin/users/:id/status — suspend (transfer/dismissal) or re-activate
export async function setOfficialStatus(req: Request, res: Response): Promise<void> {
  const parse = SetStatusSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const id = req.params['id'] as string;
  const { status } = parse.data;

  if (id === req.user!.id) {
    // Lockout guard — an admin cannot suspend their own account
    res.status(409).json({ message: 'You cannot change the status of your own account' });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target || target.role === 'citizen') {
    res.status(404).json({ message: 'Official account not found' });
    return;
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { status },
      select: SAFE_USER_SELECT,
    });

    await appendLog(
      req.user!.id,
      req.user!.role,
      status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      'USER',
      id,
      { email: updated.email, role: updated.role, new_status: status },
      tx,
    );

    return updated;
  });

  res.json({ message: `Account ${status === 'SUSPENDED' ? 'suspended' : 'activated'}`, user });
}
