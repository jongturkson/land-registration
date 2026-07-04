import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { generateTitleCertificatePdf } from '../../services/pdf.service';
import { appendLog } from '../../services/ledger.service';
import { CancelTitleSchema } from '../../shared/schemas/title.schema';
import { DIRECT_TYPES, trackFor } from '../applications/workflow';

// Title issuance requires the file to be formally CLEARED first. Issuing
// straight from OPPOSITION_WINDOW would let the registrar bypass the statutory
// closing of the 30-day window.
const ISSUABLE_STATUSES = new Set(['CLEARED']);

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

// POST /applications/:id/issue-title — registrar-only, final statutory act.
// FULL track: immatriculation of a new parcel.
// CARVE_OUT track: issuance of the child title AND geometric reduction of the
// mother parcel (morcellement) — the mother title stays VALID with its new,
// smaller consistency.
// Registrar-direct types (mutation totale / hypothèque / mainlevée) never issue
// a title — they are finalised through /execute instead.
export async function issueTitle(req: Request, res: Response): Promise<void> {
  const applicationId = req.params['id'] as string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          applicant: true,
          parcel: true,
          source_title: { include: { parcel: true, owners: { where: { is_current: true } } } },
        },
      });

      if (!application) {
        throw new IssueTitleError(404, 'Application not found');
      }
      if (DIRECT_TYPES.has(application.type)) {
        throw new IssueTitleError(
          409,
          'This application type mutates the existing title — finalise it with the Execute Registration action, not title issuance.',
        );
      }
      if (!ISSUABLE_STATUSES.has(application.status)) {
        throw new IssueTitleError(
          409,
          'Application must be in CLEARED status to issue a title',
        );
      }
      if (!application.parcel_id || !application.parcel) {
        throw new IssueTitleError(409, 'Application has no associated parcel');
      }

      const isCarveOut = trackFor(application.type) === 'CARVE_OUT';
      if (isCarveOut && !application.source_title) {
        throw new IssueTitleError(409, 'Carve-out application has no source (mother) title');
      }

      // Legal blocker: an unresolved opposition freezes the immatriculation.
      const activeDisputes = await tx.dispute.count({
        where: { application_id: applicationId, status: 'ACTIVE' },
      });
      if (activeDisputes > 0) {
        throw new IssueTitleError(
          403,
          'Forbidden: Cannot issue title. Active oppositions must be lifted (mainlevée) first.',
        );
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
          ...(application.parcel.nature ? { nature: application.parcel.nature } : {}),
        },
      });

      // Carry the applicant's civil status (captured on the Demande) onto the
      // title owner record. "Ancestors" combines the named parents.
      const ancestors = [application.applicant_father, application.applicant_mother]
        .filter(Boolean)
        .join(' & ');

      const owner = await tx.titleOwner.create({
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

      // ── Morcellement: shrink the mother parcel by the carved-out child ────
      // The child polygon was validated (ST_Within) at survey time. Here the
      // mother's geometry becomes mother − child and its legal area is
      // recomputed from the remaining geometry. If the subtraction fragments
      // the mother into several pieces (MultiPolygon), the stored polygon is
      // left untouched but the area is still corrected.
      let remainingMotherArea: string | null = null;
      if (isCarveOut && application.source_title) {
        const motherParcelId = application.source_title.parcel_id;
        await tx.$executeRaw`
          UPDATE "Parcel" p
          SET geom = CASE
                       WHEN GeometryType(d.diff) = 'POLYGON' THEN d.diff
                       ELSE p.geom
                     END,
              area_sqm = ROUND(ST_Area(d.diff::geography)::numeric, 2)
          FROM (
            SELECT ST_Difference(m.geom, c.geom) AS diff
            FROM "Parcel" m, "Parcel" c
            WHERE m.id = ${motherParcelId}::uuid
              AND c.id = ${application.parcel.id}::uuid
          ) d
          WHERE p.id = ${motherParcelId}::uuid AND d.diff IS NOT NULL
        `;
        const areaRows = await tx.$queryRaw<{ area_sqm: string | null }[]>`
          SELECT area_sqm::text AS area_sqm FROM "Parcel" WHERE id = ${motherParcelId}::uuid
        `;
        remainingMotherArea = areaRows[0]?.area_sqm ?? null;

        // Ledger: both sides of the morcellement
        await appendLog(
          req.user!.id,
          req.user!.role,
          'PARTIAL_ALIENATION_SENDER',
          'TITLE',
          application.source_title.id,
          {
            title_no: application.source_title.title_no,
            remaining_area_sqm: remainingMotherArea,
            child_title_no: title.title_no,
            application_id: application.id,
          },
          tx,
        );
      }

      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: { status: 'TITLE_ISSUED' },
      });

      // Digital Livre Foncier: hash-chained ledger entry for the issuance event
      await appendLog(
        req.user!.id,
        req.user!.role,
        isCarveOut ? 'PARTIAL_ALIENATION_RECEIVER' : 'IMMATRICULATION',
        'TITLE',
        title.id,
        {
          title_id: title.id,
          title_no: title.title_no,
          application_id: application.id,
          parcel_id: application.parcel.id,
          owner: owner.full_name,
          issued_by: req.user!.id,
          issued_at: title.issued_at,
          ...(isCarveOut && application.source_title
            ? { mother_title_no: application.source_title.title_no }
            : {}),
        },
        tx,
      );

      return { title, owner, application: updatedApplication, parcel: application.parcel };
    });

    const certificatePath = await generateTitleCertificatePdf({
      title_no: result.title.title_no,
      volume: result.title.volume,
      folio: result.title.folio,
      division: result.title.division,
      nature: result.parcel.nature,
      parcel: {
        plot_no: result.parcel.plot_no,
        block_no: result.parcel.block_no,
        sub_division: result.parcel.sub_division,
        situation: result.parcel.situation,
        area_sqm: result.parcel.area_sqm?.toString() ?? null,
        limit_north: result.parcel.limit_north,
        limit_south: result.parcel.limit_south,
        limit_east: result.parcel.limit_east,
        limit_west: result.parcel.limit_west,
      },
      owner: {
        full_name: result.owner.full_name,
        ancestors: result.owner.ancestors,
        birth_place: result.owner.birth_place,
        birth_date: result.owner.birth_date,
        marital_status: result.application.marital_status,
        nationality: result.application.applicant_nationality,
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

// POST /titles/:title_no/cancel — ministerial cancellation (retrait du titre).
// The register is otherwise append-only: this is the sole direct registry
// action left to the Conservateur, and it demands the ministerial order
// reference plus an explicit confirmation. The title row is preserved with
// status CANCELLED — never deleted — and the act is chained to the ledger.
export async function cancelTitle(req: Request, res: Response): Promise<void> {
  const title_no = req.params['title_no'] as string;

  const parse = CancelTitleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { ministerial_order_ref, reason } = parse.data;

  const title = await prisma.title.findUnique({
    where: { title_no },
    include: { owners: { where: { is_current: true }, select: { full_name: true } } },
  });
  if (!title) {
    res.status(404).json({ message: 'Title not found' });
    return;
  }
  if (title.status !== 'VALID') {
    res.status(409).json({ message: 'Only VALID titles can be cancelled' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.title.update({
      where: { id: title.id },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        cancellation_ref: ministerial_order_ref,
      },
    });

    await appendLog(
      req.user!.id,
      req.user!.role,
      'TITLE_CANCELLED',
      'TITLE',
      title.id,
      {
        title_no: title.title_no,
        ministerial_order_ref,
        reason: reason ?? null,
        owner: title.owners[0]?.full_name ?? null,
      },
      tx,
    );

    return cancelled;
  });

  res.json({
    message: `Title ${title_no} cancelled by ministerial order ${ministerial_order_ref}`,
    title: updated,
  });
}
