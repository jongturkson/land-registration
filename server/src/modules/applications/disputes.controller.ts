import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';
import { FileDisputeSchema, ResolveDisputeSchema } from '../../shared/schemas/title.schema';

// Ledger actor recorded for anonymous public filings (no authenticated user)
const PUBLIC_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

// POST /applications/:reference_no/dispute — public route.
// Any interested party may file an opposition against an application whose
// statutory 30-day opposition window is open.
export async function fileDispute(req: Request, res: Response): Promise<void> {
  const reference_no = req.params['reference_no'] as string;

  const parse = FileDisputeSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { opponent_name, opponent_contact, grounds } = parse.data;

  const application = await prisma.application.findFirst({ where: { reference_no } });
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  if (application.status !== 'OPPOSITION_WINDOW') {
    res.status(409).json({
      message:
        'Oppositions can only be filed while the 30-day opposition window is open for this application',
    });
    return;
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        application_id: application.id,
        opponent_name,
        grounds,
        status: 'ACTIVE',
        ...(opponent_contact ? { opponent_contact } : {}),
      },
    });

    await appendLog(
      PUBLIC_ACTOR_ID,
      'public',
      'DISPUTE_FILED',
      'APPLICATION',
      application.id,
      {
        dispute_id: created.id,
        reference_no,
        opponent_name,
        grounds,
      },
      tx,
    );

    return created;
  });

  res.status(201).json({
    message:
      'Opposition filed successfully. The application is now blocked from title issuance until the opposition is lifted (mainlevée).',
    dispute: {
      id: dispute.id,
      reference_no,
      status: dispute.status,
      filed_at: dispute.filed_at,
    },
  });
}

// POST /disputes/:id/resolve — registrar lifts (mainlevée) or records the
// withdrawal of an opposition, unblocking title issuance.
export async function resolveDispute(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const parse = ResolveDisputeSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { resolution_notes, outcome } = parse.data;

  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) {
    res.status(404).json({ message: 'Dispute not found' });
    return;
  }

  if (dispute.status !== 'ACTIVE') {
    res.status(409).json({ message: 'Only ACTIVE disputes can be resolved' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const resolved = await tx.dispute.update({
      where: { id },
      data: {
        status: outcome,
        resolution_notes,
        resolved_by: req.user!.id,
        resolved_at: new Date(),
      },
    });

    await appendLog(
      req.user!.id,
      req.user!.role,
      'DISPUTE_RESOLVED',
      'APPLICATION',
      dispute.application_id,
      {
        dispute_id: dispute.id,
        outcome,
        resolution_notes,
      },
      tx,
    );

    return resolved;
  });

  res.json({ message: 'Dispute resolved (mainlevée recorded)', dispute: updated });
}
