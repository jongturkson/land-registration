import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';
import { ExecuteApplicationSchema } from '../../shared/schemas/title.schema';
import { DIRECT_TYPES } from '../applications/workflow';

// POST /applications/:id/execute — the Conservateur Foncier finalises a
// CLEARED registrar-direct application by writing the corresponding entry in
// the Livre Foncier. The register is only ever mutated through applications:
//
//   TOTAL_ALIENATION  — mutation totale: the current owner is retired and the
//                       applicant (buyer) becomes the current owner. The title
//                       number, volume and folio are unchanged. Active
//                       mortgages do NOT block the transfer (the Registrar is
//                       warned in the UI); the charge follows the land.
//   MORTGAGE          — an ACTIVE hypothèque is inscribed for the creditor
//                       named on the application.
//   MORTGAGE_RELEASE  — mainlevée: the matching ACTIVE mortgage is cleared.
//
// The application then reaches its terminal COMPLETED status.

class ExecutionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function executeApplication(req: Request, res: Response): Promise<void> {
  const applicationId = req.params['id'] as string;

  const parse = ExecuteApplicationSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { notes } = parse.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          source_title: {
            include: {
              owners: { where: { is_current: true } },
              encumbrances: { where: { status: 'ACTIVE' } },
            },
          },
        },
      });

      if (!application) {
        throw new ExecutionError(404, 'Application not found');
      }
      if (!DIRECT_TYPES.has(application.type)) {
        throw new ExecutionError(
          409,
          'Only registrar-direct applications (total alienation, mortgage, mortgage release) are executed through this action.',
        );
      }
      if (application.status !== 'CLEARED') {
        throw new ExecutionError(409, 'Application must be CLEARED before it can be executed');
      }
      const title = application.source_title;
      if (!title) {
        throw new ExecutionError(409, 'Application has no source title on record');
      }
      if (title.status !== 'VALID') {
        throw new ExecutionError(409, `Title ${title.title_no} is no longer VALID`);
      }

      let summary: string;

      if (application.type === 'TOTAL_ALIENATION') {
        // ── Mutation totale: ownership changes on the existing title ────────
        const previousOwners = title.owners.map((o) => o.full_name);

        await tx.titleOwner.updateMany({
          where: { title_id: title.id, is_current: true },
          data: { is_current: false },
        });

        const ancestors = [application.applicant_father, application.applicant_mother]
          .filter(Boolean)
          .join(' & ');

        const newOwner = await tx.titleOwner.create({
          data: {
            title_id: title.id,
            full_name: application.applicant.full_name,
            is_current: true,
            ...(ancestors ? { ancestors } : {}),
            ...(application.applicant_birth_place
              ? { birth_place: application.applicant_birth_place }
              : {}),
            ...(application.applicant_birth_date
              ? { birth_date: application.applicant_birth_date }
              : {}),
          },
        });

        await appendLog(
          req.user!.id,
          req.user!.role,
          'TOTAL_ALIENATION',
          'TITLE',
          title.id,
          {
            title_no: title.title_no,
            previous_owners: previousOwners,
            new_owner: newOwner.full_name,
            application_id: application.id,
            carried_encumbrances: title.encumbrances.map((e) => ({
              kind: e.kind,
              party: e.party,
            })),
            notes: notes ?? null,
          },
          tx,
        );

        summary = `Ownership of ${title.title_no} transferred to ${newOwner.full_name}. Previous owner(s) retired.`;
        if (title.encumbrances.length > 0) {
          summary += ` ${title.encumbrances.length} active encumbrance(s) carried over with the land.`;
        }
      } else if (application.type === 'MORTGAGE') {
        // ── Hypothèque: inscribe the encumbrance ────────────────────────────
        const creditor = application.mortgage_creditor;
        if (!creditor) {
          throw new ExecutionError(409, 'Mortgage application has no creditor on record');
        }

        const encumbrance = await tx.encumbrance.create({
          data: {
            title_id: title.id,
            kind: 'MORTGAGE',
            party: creditor,
            status: 'ACTIVE',
          },
        });

        await appendLog(
          req.user!.id,
          req.user!.role,
          'MORTGAGE_ADDED',
          'TITLE',
          title.id,
          {
            title_no: title.title_no,
            encumbrance_id: encumbrance.id,
            creditor,
            amount: application.mortgage_amount ?? null,
            application_id: application.id,
            notes: notes ?? null,
          },
          tx,
        );

        summary = `Mortgage in favour of ${creditor} inscribed on ${title.title_no}.`;
      } else {
        // ── Mainlevée d'hypothèque: clear the matching active mortgage ──────
        const activeMortgages = title.encumbrances.filter((e) => e.kind === 'MORTGAGE');
        if (activeMortgages.length === 0) {
          throw new ExecutionError(
            409,
            `Title ${title.title_no} has no active mortgage to release`,
          );
        }

        const creditor = application.mortgage_creditor?.trim().toLowerCase();
        const matching = creditor
          ? activeMortgages.filter((e) => (e.party ?? '').trim().toLowerCase() === creditor)
          : activeMortgages;

        if (matching.length === 0) {
          throw new ExecutionError(
            409,
            `No active mortgage held by "${application.mortgage_creditor}" was found on ${title.title_no}`,
          );
        }
        if (matching.length > 1) {
          throw new ExecutionError(
            409,
            'Several active mortgages match — the application must name the creditor whose charge is being released',
          );
        }

        const target = matching[0]!;
        const released = await tx.encumbrance.update({
          where: { id: target.id },
          data: { status: 'CLEARED', cleared_at: new Date() },
        });

        await appendLog(
          req.user!.id,
          req.user!.role,
          'MORTGAGE_RELEASED',
          'TITLE',
          title.id,
          {
            title_no: title.title_no,
            encumbrance_id: released.id,
            creditor: target.party,
            application_id: application.id,
            notes: notes ?? null,
          },
          tx,
        );

        summary = `Mortgage held by ${target.party ?? 'creditor'} on ${title.title_no} released (mainlevée).`;
      }

      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: { status: 'COMPLETED' },
      });

      await tx.approval.create({
        data: {
          application_id: applicationId,
          step: 'Registration Executed',
          actor_id: req.user!.id,
          role: req.user!.role,
          decision: summary,
        },
      });

      return { application: updatedApplication, summary, title_no: title.title_no };
    });

    res.json({
      message: result.summary,
      application: result.application,
      title_no: result.title_no,
    });
  } catch (err) {
    if (err instanceof ExecutionError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    throw err;
  }
}
