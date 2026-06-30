import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { generateTitleCertificatePdf } from '../../services/pdf.service';

const ISSUABLE_STATUSES = new Set(['OPPOSITION_WINDOW', 'CLEARED']);

class IssueTitleError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function generateTitleNo(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `TF-${year}-${rand}`;
}

function generateVolume(): string {
  return String(Math.floor(1 + Math.random() * 500));
}

function generateFolio(): string {
  return String(Math.floor(1 + Math.random() * 200));
}

// POST /applications/:id/issue-title — registrar-only, final statutory act of immatriculation
export async function issueTitle(req: Request, res: Response): Promise<void> {
  const applicationId = req.params['id'] as string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: { applicant: true, parcel: true },
      });

      if (!application) {
        throw new IssueTitleError(404, 'Application not found');
      }
      if (!ISSUABLE_STATUSES.has(application.status)) {
        throw new IssueTitleError(
          409,
          'Application must be in OPPOSITION_WINDOW or CLEARED status to issue a title',
        );
      }
      if (!application.parcel_id || !application.parcel) {
        throw new IssueTitleError(409, 'Application has no associated parcel');
      }

      let title_no = generateTitleNo();
      while (await tx.title.findUnique({ where: { title_no } })) {
        title_no = generateTitleNo();
      }

      const title = await tx.title.create({
        data: {
          title_no,
          volume: generateVolume(),
          folio: generateFolio(),
          division: application.parcel.division,
          parcel_id: application.parcel.id,
          issued_by: req.user!.id,
          issued_at: new Date(),
          status: 'VALID',
        },
      });

      const owner = await tx.titleOwner.create({
        data: {
          title_id: title.id,
          full_name: application.applicant.full_name,
          is_current: true,
        },
      });

      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: { status: 'TITLE_ISSUED' },
      });

      // Digital Livre Foncier: hash-chained ledger entry for the immatriculation event
      const lastEntry = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' } });
      const prev_hash = lastEntry?.self_hash ?? null;
      const payload = {
        title_id: title.id,
        title_no: title.title_no,
        application_id: application.id,
        parcel_id: application.parcel.id,
        owner: owner.full_name,
        issued_by: req.user!.id,
        issued_at: title.issued_at,
      };
      const self_hash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ prev_hash, payload }))
        .digest('hex');

      await tx.auditLog.create({
        data: {
          actor_id: req.user!.id,
          actor_role: req.user!.role,
          event: 'IMMATRICULATION',
          entity: 'TITLE',
          entity_id: title.id,
          payload,
          prev_hash,
          self_hash,
        },
      });

      return { title, owner, application: updatedApplication, parcel: application.parcel };
    });

    const certificatePath = await generateTitleCertificatePdf({
      title_no: result.title.title_no,
      volume: result.title.volume,
      folio: result.title.folio,
      division: result.title.division,
      parcel: {
        plot_no: result.parcel.plot_no,
        block_no: result.parcel.block_no,
        sub_division: result.parcel.sub_division,
        situation: result.parcel.situation,
        area_sqm: result.parcel.area_sqm?.toString() ?? null,
      },
      owner: {
        full_name: result.owner.full_name,
        ancestors: result.owner.ancestors,
        birth_place: result.owner.birth_place,
      },
      issued_at: result.title.issued_at ?? new Date(),
    });

    const title = await prisma.title.update({
      where: { id: result.title.id },
      data: { certificate_pdf_path: certificatePath },
    });

    res.status(201).json({
      message: 'Land Certificate issued successfully',
      title,
      application: result.application,
    });
  } catch (err) {
    if (err instanceof IssueTitleError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    throw err;
  }
}

// GET /titles/:id/download — secure download of the generated certificate PDF
export async function downloadTitleCertificate(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const title = await prisma.title.findUnique({ where: { id } });
  if (!title || !title.certificate_pdf_path) {
    res.status(404).json({ message: 'Certificate not found' });
    return;
  }

  if (!fs.existsSync(title.certificate_pdf_path)) {
    res.status(404).json({ message: 'Certificate file not found on server' });
    return;
  }

  res.download(title.certificate_pdf_path, `${path.basename(title.certificate_pdf_path)}`);
}
