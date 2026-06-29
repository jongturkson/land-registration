import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import {
  CreateApplicationSchema,
  SubmitApplicationSchema,
} from '../../shared/schemas/application.schema';

function generateReferenceNo(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `APP-${year}-${seq}`;
}

// POST /applications
export async function createApplication(req: Request, res: Response): Promise<void> {
  const parse = CreateApplicationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const { type, parcel_id } = parse.data;

  const application = await prisma.application.create({
    data: {
      type,
      applicant_id: req.user!.id,
      ...(parcel_id ? { parcel_id } : {}),
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
  if (!docTypes.has('ID_CARD') || !docTypes.has('SITE_PLAN')) {
    res.status(400).json({
      message:
        'Mandatory documents missing. You must upload an ID card and Site Plan before submitting.',
    });
    return;
  }

  const reference_no = generateReferenceNo();

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

// GET /applications  — officer-scoped by region
export async function listApplications(req: Request, res: Response): Promise<void> {
  const region = req.user!.region;

  const applications = await prisma.application.findMany({
    where: {
      applicant: { region },
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
