import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { AppType } from '../../generated/prisma/enums';
import {
  CreateApplicationSchema,
  SubmitApplicationSchema,
  TransitionApplicationSchema,
} from '../../shared/schemas/application.schema';
import {
  checkTransition,
  requiredDocTypes,
  requiresOppositionWindow,
  trackFor,
  SOURCE_TITLE_TYPES,
  DIRECT_TYPES,
  CARVE_OUT_TYPES,
  FULL_TYPES,
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
      // Reception desk handles first registrations only — carve-outs and
      // registrar-direct files never pass through the SDO.
      return {
        status: { in: ['SUBMITTED', 'RECEIPTED', 'PUBLISHED', 'QUERIED', 'REJECTED'] },
        type: { in: [...FULL_TYPES] as AppType[] },
      };
    case 'surveyor':
      // Files awaiting the Procès-Verbal de Bornage: public-notice stage on the
      // full track, or a registrar-commissioned carve-out survey
      return { status: { in: ['PUBLISHED', 'SURVEY_ORDERED'] } };
    case 'divisional_delegate':
      // Dossier assembly exists only on the full first-registration track
      return {
        status: { in: ['SURVEYED', 'REGIONAL_REVIEW'] },
        type: { in: [...FULL_TYPES] as AppType[] },
      };
    case 'regional_delegate':
      return {
        status: { in: ['REGIONAL_REVIEW', 'OPPOSITION_WINDOW'] },
        type: { in: [...FULL_TYPES] as AppType[] },
      };
    case 'registrar':
      return {
        OR: [
          // Full-track stages under the Conservateur's authority
          {
            status: {
              in: ['REGIONAL_REVIEW', 'OPPOSITION_WINDOW', 'CLEARED', 'TITLE_ISSUED', 'COMPLETED'],
            },
          },
          // Registrar-led tracks land directly on the Conservateur's desk
          {
            status: { in: ['SUBMITTED', 'SURVEY_ORDERED', 'SURVEYED', 'QUERIED'] },
            type: { in: [...CARVE_OUT_TYPES, ...DIRECT_TYPES] as AppType[] },
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
  SUBMITTED: 'File Re-opened',
  RECEIPTED: 'Receipt Acknowledgement',
  PUBLISHED: 'Initial Review',
  BOARD_SCHEDULED: 'Board Scheduling',
  SURVEY_ORDERED: 'Survey Commissioned',
  SURVEYED: 'Survey Complete',
  REGIONAL_REVIEW: 'Regional Review',
  OPPOSITION_WINDOW: 'Opposition Window',
  CLEARED: 'Clearance',
  TITLE_ISSUED: 'Title Issuance',
  COMPLETED: 'Registration Executed',
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

  const { type, parcel_id, source_title_no, applicant, land, mortgage } = parse.data;

  // Types that operate on an existing title (alienations, partition, mortgage,
  // mortgage release) must be anchored to a VALID title in the register.
  let sourceTitleId: string | undefined;
  let sourceParcelId: string | undefined;
  if (SOURCE_TITLE_TYPES.has(type)) {
    if (!source_title_no) {
      res.status(400).json({
        message: 'This application type requires the existing Land Title Number it operates on.',
      });
      return;
    }
    const sourceTitle = await prisma.title.findUnique({
      where: { title_no: source_title_no },
      select: { id: true, status: true, parcel_id: true },
    });
    if (!sourceTitle) {
      res.status(404).json({
        message: `No land title found with number ${source_title_no}. Check the number on the Titre Foncier.`,
      });
      return;
    }
    if (sourceTitle.status !== 'VALID') {
      res.status(409).json({
        message: `Title ${source_title_no} is not VALID (status: ${sourceTitle.status}) and cannot be operated on.`,
      });
      return;
    }
    sourceTitleId = sourceTitle.id;
    sourceParcelId = sourceTitle.parcel_id;
  }

  // A mortgage inscription needs the creditor being secured
  if (type === 'MORTGAGE' && !mortgage?.creditor?.trim()) {
    res.status(400).json({
      message: 'A mortgage application must name the creditor (bank / lender) being secured.',
    });
    return;
  }

  // When the wizard supplies land details, create the Parcel and link it. An
  // explicit parcel_id (e.g. for alienation of an existing parcel) takes priority.
  // Registrar-direct types operate on the source title's existing parcel — no
  // new parcel is ever created for them.
  let resolvedParcelId = DIRECT_TYPES.has(type) ? sourceParcelId : parcel_id;
  if (!resolvedParcelId && !DIRECT_TYPES.has(type) && land) {
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
      ...(sourceTitleId ? { source_title_id: sourceTitleId } : {}),
      ...(mortgage?.creditor?.trim() ? { mortgage_creditor: mortgage.creditor.trim() } : {}),
      ...(mortgage?.amount !== undefined ? { mortgage_amount: mortgage.amount } : {}),
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
      // The mother/source title an alienation, partition, mortgage or release
      // operates on — with the data the Registrar and Surveyor need to act
      source_title: {
        select: {
          id: true,
          title_no: true,
          volume: true,
          folio: true,
          status: true,
          division: true,
          parcel_id: true,
          owners: { where: { is_current: true }, select: { full_name: true } },
          encumbrances: {
            where: { status: 'ACTIVE' },
            select: { id: true, kind: true, party: true, recorded_at: true },
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

  // Attach the mother parcel geometry (GeoJSON) so the surveyor can carve the
  // child parcel from the mother polygon on the map
  let sourceGeometry: unknown = null;
  let sourceArea: string | null = null;
  if (application.source_title?.parcel_id) {
    const rows = await prisma.$queryRaw<{ geojson: string | null; area_sqm: string | null }[]>`
      SELECT ST_AsGeoJSON(geom) AS geojson, area_sqm::text AS area_sqm
      FROM "Parcel" WHERE id = ${application.source_title.parcel_id}::uuid
    `;
    sourceGeometry = rows[0]?.geojson ? JSON.parse(rows[0].geojson) : null;
    sourceArea = rows[0]?.area_sqm ?? null;
  }

  res.json({
    ...application,
    source_title: application.source_title
      ? { ...application.source_title, geometry: sourceGeometry, area_sqm: sourceArea }
      : null,
  });
}

// GET /applications/mine — the citizen's own applications with the full
// decision history (query/rejection reasons included) and any issued title
export async function myApplications(req: Request, res: Response): Promise<void> {
  const applications = await prisma.application.findMany({
    where: { applicant_id: req.user!.id },
    include: {
      approvals: {
        orderBy: { signed_at: 'asc' },
        select: { step: true, decision: true, role: true, signed_at: true },
      },
      parcel: {
        select: {
          titles: {
            orderBy: { issued_at: 'desc' },
            take: 1,
            select: { id: true, title_no: true, certificate_pdf_path: true },
          },
        },
      },
      source_title: { select: { title_no: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(
    applications.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      reference_no: a.reference_no,
      created_at: a.created_at,
      updated_at: a.updated_at,
      source_title_no: a.source_title?.title_no ?? null,
      approvals: a.approvals,
      issued_title: a.parcel?.titles?.[0]
        ? {
            id: a.parcel.titles[0].id,
            title_no: a.parcel.titles[0].title_no,
            has_certificate: !!a.parcel.titles[0].certificate_pdf_path,
          }
        : null,
    })),
  );
}

// GET /applications/:id/certificate — the applicant downloads their own issued
// Titre Foncier PDF, without needing officer registry permissions
export async function downloadOwnCertificate(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      parcel: {
        select: {
          titles: {
            orderBy: { issued_at: 'desc' },
            take: 1,
            select: { title_no: true, certificate_pdf_path: true },
          },
        },
      },
    },
  });

  if (!application || application.applicant_id !== req.user!.id) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  const title = application.parcel?.titles?.[0];
  if (!title?.certificate_pdf_path || !fs.existsSync(title.certificate_pdf_path)) {
    res.status(404).json({ message: 'No certificate is available for this application yet' });
    return;
  }

  res.download(title.certificate_pdf_path, `${path.basename(title.certificate_pdf_path)}`);
}

// GET /applications/:id/track  — public, resolves by reference_no.
// Returns the status plus the step timeline (step label + date only — decision
// notes are private to the applicant and shown in My Applications instead).
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
      approvals: {
        orderBy: { signed_at: 'asc' },
        select: { step: true, signed_at: true },
      },
    },
  });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  res.json(application);
}
