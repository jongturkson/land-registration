import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';

// ─── Mock Mobile Money payment gateway ──────────────────────────────────────

const SimulatePaymentSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  provider: z.enum(['MOMO', 'ORANGE_MONEY']),
});

// POST /payments/simulate — public. Simulates an MTN MoMo / Orange Money charge:
// waits ~2s to mimic the USSD PIN prompt, then returns a fake transaction id.
export async function simulatePayment(req: Request, res: Response): Promise<void> {
  const parse = SimulatePaymentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid payment request', errors: parse.error.issues });
    return;
  }

  const { phone, amount, provider } = parse.data;

  // Simulated network / USSD confirmation delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const transaction_id = `TX-${Date.now()}`;

  // Record the (mock) payment for the audit trail
  await prisma.payment.create({
    data: {
      purpose: 'TITLE_VERIFICATION',
      amount: Math.round(amount),
      provider,
      provider_ref: transaction_id,
      status: 'SUCCESS',
    },
  });

  res.json({ success: true, transaction_id, provider, phone });
}

// ─── Public title existence check ───────────────────────────────────────────

// GET /titles/:title_no/validate — public, free, no payment gate. Used by the
// application wizard to confirm live that the mother title exists and is VALID
// before the citizen files an alienation / partition / mortgage application.
// Deliberately minimal: it never discloses the owner or the parcel details.
export async function validateTitleNo(req: Request, res: Response): Promise<void> {
  const title_no = (req.params['title_no'] as string).trim();

  const title = await prisma.title.findUnique({
    where: { title_no },
    select: { status: true, division: true },
  });

  if (!title) {
    res.json({ found: false });
    return;
  }

  res.json({ found: true, status: title.status, division: title.division });
}

// ─── Public title verification ──────────────────────────────────────────────

const VerifyTitleSchema = z.object({
  title_no: z.string().min(1, 'Title number is required'),
  volume: z.string().min(1, 'Volume is required'),
  folio: z.string().min(1, 'Folio is required'),
  requester_type: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
});

// POST /titles/verify — public. Requires a paid transaction_id; returns the
// certificate of ownership: status, current owner, and any encumbrances.
export async function verifyTitle(req: Request, res: Response): Promise<void> {
  const { transaction_id } = (req.body ?? {}) as { transaction_id?: string };

  // Payment gate — the caller must have completed the mock payment first
  if (!transaction_id) {
    res.status(402).json({ message: 'Payment required before verification' });
    return;
  }

  const parse = VerifyTitleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const { title_no, volume, folio, requester_type } = parse.data;

  const title = await prisma.title.findUnique({
    where: { title_no: title_no.trim() },
    include: {
      owners: { where: { is_current: true }, take: 1 },
      encumbrances: { orderBy: { recorded_at: 'desc' } },
    },
  });

  if (!title) {
    res.status(404).json({ message: 'No land title found with that number' });
    return;
  }

  // Volume / Folio are the Livre Foncier coordinates. All three (Number, Volume,
  // Folio) are mandatory and must match the record exactly — a mismatch means
  // these are not this title's details.
  const volumeMismatch = title.volume?.trim() !== volume.trim();
  const folioMismatch = title.folio?.trim() !== folio.trim();
  if (volumeMismatch || folioMismatch) {
    res.status(404).json({
      message: 'No land title matches the given Number, Volume and Folio combination',
    });
    return;
  }

  // Log the verification request (digital register of who searched what)
  await prisma.verificationRequest.create({
    data: {
      title_no,
      fee_status: 'PAID',
      result: title.status,
      certificate_token: transaction_id,
      requester_info: { requester_type: requester_type ?? 'INDIVIDUAL', transaction_id },
    },
  });

  const owner = title.owners[0] ?? null;

  res.json({
    title_no: title.title_no,
    volume: title.volume,
    folio: title.folio,
    division: title.division,
    nature: title.nature,
    status: title.status,
    issued_at: title.issued_at,
    owner: owner
      ? {
          full_name: owner.full_name,
          ancestors: owner.ancestors,
          birth_place: owner.birth_place,
        }
      : null,
    encumbrances: title.encumbrances.map((e) => ({
      id: e.id,
      kind: e.kind,
      party: e.party,
      status: e.status,
      recorded_at: e.recorded_at,
      cleared_at: e.cleared_at,
    })),
  });
}
