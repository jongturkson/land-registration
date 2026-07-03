import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import {
  CreateApplicationSchema,
  SubmitApplicationSchema,
  TransitionApplicationSchema,
} from '../../shared/schemas/application.schema';
import {
  checkTransition,
  requiredDocTypes,
  requiresOppositionWindow,
} from './workflow';
import { getSystemSettings } from '../../services/settings.service';

// reference_no carries a UNIQUE constraint; retry on the (rare) collision
async function generateReferenceNo(): Promise<string> {
  const year = new Date().getFullYear();
  for (;;) {
    const seq = String(Math.floor(100000 + Math.random() * 900000));
    const candidate = `APP-${year}-${seq}`;
    const existing = await prisma.application.findUnique({
      where: { reference_no: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
}

// "If something is not for you, it should not appear to you": each office's
// queue is scoped server-side to the statuses that office is competent for.
// DRAFT is excluded everywhere — drafts belong to the citizen alone.
function officerQueueFilter(role: string): Prisma.ApplicationWhereInput {
  switch (role) {
    case 'sub_divisional_officer':
      return {
        status: { in: ['SUBMITTED', 'RECEIPTED', 'PUBLISHED', 'QUERIED', 'REJECTED'] },
      };
    case 'surveyor':
      // Only files awaiting the Procès-Verbal de Bornage
      return { status: 'PUBLISHED' };
    case 'divisional_delegate':
      return { status: { in: ['SURVEYED', 'REGIONAL_REVIEW'] } };
    case 'regional_delegate':
      return { status: { in: ['REGIONAL_REVIEW', 'OPPOSITION_WINDOW'] } };
    case 'registrar':
      return {
        OR: [
          {
            status: {
              in: ['REGIONAL_REVIEW', 'OPPOSITION_WINDOW', 'CLEARED', 'TITLE_ISSUED'],
            },
          },
          // Notarial fast-track files land on the Conservateur's desk at receipt
          {
            status: 'RECEIPTED',
            type: { in: ['TOTAL_ALIENATION', 'MORTGAGE'] },
          },
        ],
      };
    default:
      // Oversight roles (governor, chief, admin) see everything except drafts
      return { status: { not: 'DRAFT' } };
  }
}

// Maps new_status → a human-readable step label stored in the Approval record
const TRANSITION_STEP: Partial<Record<string, string>> = {
  RECEIPTED: 'Receipt Acknowledgement',
  PUBLISHED: 'Initial Review',
  BOARD_SCHEDULED: 'Board Scheduling',
  SURVEYED: 'Survey Complete',
  REGIONAL_REVIEW: 'Regional Review',
  OPPOSITION_WINDOW: 'Opposition Window',
  CLEARED: 'Clearance',
  TITLE_ISSUED: 'Title Issuance',
  QUERIED: 'Query Raised',
  REJECTED: 'Rejection',
};

// POST /applications
export async function createApplication(req: Request, res: Response): Promise<void> {
  const parse = CreateApplicationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const { type, parcel_id, applicant, land } = parse.data;

  // When the wizard supplies land details, create the Parcel and link it. An
  // explicit parcel_id (e.g. for alienation of an existing parcel) takes priority.
  let resolvedParcelId = parcel_id;
  if (!resolvedParcelId && land) {
    const parcel = await prisma.parcel.create({
      data: {
        division: land.division,
        ...(land.subdivision ? { sub_division: land.subdivision } : {}),
        ...(land.plot_no ? { plot_no: land.plot_no } : {}),
        ...(land.block_no ? { block_no: land.block_no } : {}),
        ...(land.situation ? { situation: land.situation } : {}),
        ...(land.nature ? { nature: land.nature } : {}),
        ...(land.area !== undefined ? { area_sqm: land.area } : {}),
        ...(land.limit_north ? { limit_north: land.limit_north } : {}),
        ...(land.limit_south ? { limit_south: land.limit_south } : {}),
        ...(land.limit_east ? { limit_east: land.limit_east } : {}),
        ...(land.limit_west ? { limit_west: land.limit_west } : {}),
        ...(land.developments ? { developments: land.developments } : {}),
        ...(land.dev_value !== undefined ? { dev_value: land.dev_value } : {}),
        ...(land.others_occupy !== undefined ? { others_occupy: land.others_occupy } : {}),
      },
    });
    resolvedParcelId = parcel.id;
  }

  const application = await prisma.application.create({
    data: {
      type,
      applicant_id: req.user!.id,
      ...(resolvedParcelId ? { parcel_id: resolvedParcelId } : {}),
      ...(applicant?.father ? { applicant_father: applicant.father } : {}),
      ...(applicant?.mother ? { applicant_mother: applicant.mother } : {}),
      ...(applicant?.nationality ? { applicant_nationality: applicant.nationality } : {}),
      ...(applicant?.birth_place ? { applicant_birth_place: applicant.birth_place } : {}),
      ...(applicant?.birth_date ? { applicant_birth_date: new Date(applicant.birth_date) } : {}),
      ...(applicant?.profession ? { applicant_profession: applicant.profession } : {}),
      ...(applicant?.marital_status ? { marital_status: applicant.marital_status } : {}),
      ...(applicant?.matrimonial_regime
        ? { matrimonial_regime: applicant.matrimonial_regime }
        : {}),
    },
  });

  res.status(201).json(application);
}

// POST /applications/:id/submit
export async function submitApplication(req: Request, res: Response): Promise<void> {
  const parse = SubmitApplicationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const id = req.params['id'] as string;

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  if (application.applicant_id !== req.user!.id) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  if (application.status !== 'DRAFT') {
    res.status(409).json({ message: 'Only DRAFT applications can be submitted' });
    return;
  }

  const docs = await prisma.applicationDocument.findMany({
    where: { application_id: id },
    select: { doc_type: true },
  });
  const docTypes = new Set(docs.map((d) => d.doc_type));
  // Type-specific statutory requirements: PARTITION needs the court judgment /
  // inheritance certificate; alienations & mortgages need the notarial act.
  const missing = requiredDocTypes(application.type).filter((d) => !docTypes.has(d.doc_type));
  if (missing.length > 0) {
    res.status(400).json({
      message: `Mandatory documents missing for this application type: ${missing
        .map((d) => d.label)
        .join(', ')}.`,
    });
    return;
  }

  const reference_no = await generateReferenceNo();

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      reference_no,
      ...(parse.data.parcel_id ? { parcel_id: parse.data.parcel_id } : {}),
    },
  });

  res.json({
    message: 'Application submitted successfully',
    reference_no: updated.reference_no,
    application: updated,
  });
}

// POST /applications/:id/transition  — officer workflow action
export async function transitionApplication(req: Request, res: Response): Promise<void> {
  const parse = TransitionApplicationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const id = req.params['id'] as string;
  const { new_status, decision } = parse.data;

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Legal state machine: only statutory transitions, by the competent office
  const check = checkTransition(application.type, application.status, new_status, req.user!.role);
  if (!check.ok) {
    res.status(check.status).json({ message: check.message });
    return;
  }

  const step = TRANSITION_STEP[new_status] ?? new_status;

  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: { status: new_status },
    }),
    prisma.approval.create({
      data: {
        application_id: id,
        step,
        actor_id: req.user!.id,
        role: req.user!.role,
        decision,
      },
    }),
  ]);

  res.json({ message: 'Application status updated', application: updated });
}

// POST /applications/:id/regional-approve — Regional Delegate approves the dossier,
// opens the statutory 30-day opposition window, and publishes a Digital Bulletin notice.
export async function regionalApprove(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const application = await prisma.application.findUnique({
    where: { id },
    include: { parcel: { select: { division: true, sub_division: true } } },
  });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  if (application.status !== 'REGIONAL_REVIEW') {
    res.status(409).json({
      message: 'Application must be in REGIONAL_REVIEW status to be approved at regional level',
    });
    return;
  }

  // The 30-day opposition window is a first-registration formality. Notarial
  // transfers and subdivisions of already-titled land never pass through it.
  if (!requiresOppositionWindow(application.type)) {
    res.status(409).json({
      message:
        'This application type does not pass through the public opposition window. Clear it directly for registration instead.',
    });
    return;
  }

  if (!application.reference_no) {
    res.status(409).json({ message: 'Application has no reference number' });
    return;
  }

  const location = application.parcel
    ? [application.parcel.division, application.parcel.sub_division].filter(Boolean).join(', ')
    : 'unspecified location';

  // Statutory window length is admin-configurable (SystemSettings)
  const { opposition_window_days: windowDays } = await getSystemSettings();

  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: { status: 'OPPOSITION_WINDOW' },
    }),
    prisma.approval.create({
      data: {
        application_id: id,
        step: 'Regional Review',
        actor_id: req.user!.id,
        role: req.user!.role,
        decision: `Dossier approved at regional level; ${windowDays}-day opposition window opened.`,
      },
    }),
    prisma.bulletinEntry.create({
      data: {
        reference: application.reference_no,
        summary: `Avis de clôture de bornage for parcel at ${location}. ${windowDays}-day opposition window active.`,
      },
    }),
  ]);

  res.json({ message: 'Application approved at regional level', application: updated });
}

// GET /applications  — officer-scoped by region, role and stage; never drafts
export async function listApplications(req: Request, res: Response): Promise<void> {
  const region = req.user!.region;

  const applications = await prisma.application.findMany({
    where: {
      applicant: { region },
      ...officerQueueFilter(req.user!.role),
    },
    include: {
      applicant: {
        select: { id: true, full_name: true, email: true, role: true, region: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(applications);
}

// GET /applications/:id  — officer single application view with documents
export async function getApplication(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      applicant: {
        select: { id: true, full_name: true, email: true, role: true, region: true },
      },
      documents: {
        select: { id: true, doc_type: true, original_name: true, verified_flag: true },
      },
      disputes: { orderBy: { filed_at: 'desc' } },
      parcel: {
        include: {
          titles: {
            orderBy: { issued_at: 'desc' },
            take: 1,
            select: { id: true, title_no: true, certificate_pdf_path: true },
          },
        },
      },
    },
  });

  if (!application || application.status === 'DRAFT') {
    // Drafts are the citizen's private working copy — invisible to officers
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  res.json(application);
}

// GET /applications/:id/track  — public, resolves by reference_no
export async function trackApplication(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string; // id is actually the reference_no

  const application = await prisma.application.findFirst({
    where: { reference_no: id },
    select: {
      id: true,
      type: true,
      status: true,
      reference_no: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  res.json(application);
}
