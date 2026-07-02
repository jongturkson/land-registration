import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';
import { SubdivideTitleSchema } from '../../shared/schemas/title.schema';

class SubdivisionError extends Error {
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

// POST /titles/:title_no/subdivide — partial alienation (morcellement).
// A portion of the mother parcel is detached, spatially validated with PostGIS
// (the child polygon must lie entirely within the mother geometry), and a new
// title is created for the acquirer. Both sides of the mutation are appended
// to the hash-chained ledger.
export async function subdivideTitle(req: Request, res: Response): Promise<void> {
  const title_no = req.params['title_no'] as string;

  const parse = SubdivideTitleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { new_owner, area_sqm, geometry, plot_no, notes } = parse.data;
  const geometryJson = JSON.stringify(geometry);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const motherTitle = await tx.title.findUnique({
        where: { title_no },
        include: { parcel: true, owners: { where: { is_current: true } } },
      });

      if (!motherTitle) {
        throw new SubdivisionError(404, 'Mother title not found');
      }
      if (motherTitle.status !== 'VALID') {
        throw new SubdivisionError(409, 'Only VALID titles can be subdivided');
      }

      const motherArea = motherTitle.parcel.area_sqm;
      if (motherArea !== null && Number(motherArea) <= area_sqm) {
        throw new SubdivisionError(
          400,
          'Partitioned area must be strictly smaller than the mother parcel area',
        );
      }

      // ── Spatial validation (PostGIS) ────────────────────────────────────
      // The drawn sub-parcel must fall entirely within the mother geometry.
      const spatial = await tx.$queryRaw<{ has_geom: boolean; within: boolean | null }[]>`
        SELECT geom IS NOT NULL AS has_geom,
               ST_Within(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326), geom) AS within
        FROM "Parcel"
        WHERE id = ${motherTitle.parcel_id}::uuid
      `;

      const check = spatial[0];
      if (!check?.has_geom) {
        throw new SubdivisionError(
          400,
          'Mother parcel has no registered geometry — a survey must be on file before subdivision',
        );
      }
      if (!check.within) {
        throw new SubdivisionError(
          400,
          'Spatial validation failed: the proposed sub-parcel falls outside the boundaries of the mother parcel',
        );
      }

      // ── Mutate the mother parcel ────────────────────────────────────────
      const updatedMother = await tx.parcel.update({
        where: { id: motherTitle.parcel_id },
        data:
          motherArea !== null
            ? { area_sqm: new Prisma.Decimal(Number(motherArea) - area_sqm) }
            : {},
      });

      // ── Create the child parcel (raw SQL — geom is a PostGIS column) ───
      const inserted = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "Parcel"
          (division, sub_division, situation, nature, plot_no, area_sqm, status, geom)
        VALUES
          (${motherTitle.parcel.division},
           ${motherTitle.parcel.sub_division},
           ${motherTitle.parcel.situation},
           ${motherTitle.parcel.nature},
           ${plot_no ?? null},
           ${area_sqm},
           'REGISTERED',
           ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326))
        RETURNING id
      `;
      const childParcelId = inserted[0]!.id;

      // ── Issue the child title ───────────────────────────────────────────
      let childTitleNo = generateTitleNo();
      while (await tx.title.findUnique({ where: { title_no: childTitleNo } })) {
        childTitleNo = generateTitleNo();
      }

      const childTitle = await tx.title.create({
        data: {
          title_no: childTitleNo,
          division: motherTitle.division,
          parcel_id: childParcelId,
          issued_by: req.user!.id,
          issued_at: new Date(),
          status: 'VALID',
          ...(motherTitle.nature ? { nature: motherTitle.nature } : {}),
        },
      });

      const childOwner = await tx.titleOwner.create({
        data: {
          title_id: childTitle.id,
          full_name: new_owner.full_name,
          is_current: true,
          ...(new_owner.ancestors ? { ancestors: new_owner.ancestors } : {}),
          ...(new_owner.birth_place ? { birth_place: new_owner.birth_place } : {}),
          ...(new_owner.birth_date ? { birth_date: new Date(new_owner.birth_date) } : {}),
        },
      });

      // ── Ledger: both sides of the morcellement ─────────────────────────
      await appendLog(
        req.user!.id,
        req.user!.role,
        'PARTIAL_ALIENATION_SENDER',
        'TITLE',
        motherTitle.id,
        {
          title_no: motherTitle.title_no,
          detached_area_sqm: area_sqm,
          remaining_area_sqm: updatedMother.area_sqm ? Number(updatedMother.area_sqm) : null,
          child_title_no: childTitle.title_no,
          notes: notes ?? null,
        },
        tx,
      );

      await appendLog(
        req.user!.id,
        req.user!.role,
        'PARTIAL_ALIENATION_RECEIVER',
        'TITLE',
        childTitle.id,
        {
          title_no: childTitle.title_no,
          mother_title_no: motherTitle.title_no,
          area_sqm,
          owner: childOwner.full_name,
          parcel_id: childParcelId,
        },
        tx,
      );

      return { motherTitle, updatedMother, childTitle, childOwner };
    });

    res.status(201).json({
      message: 'Subdivision registered successfully (partial alienation recorded)',
      mother_title_no: result.motherTitle.title_no,
      remaining_area_sqm: result.updatedMother.area_sqm,
      new_title: {
        title_no: result.childTitle.title_no,
        owner: result.childOwner.full_name,
        area_sqm,
      },
    });
  } catch (err) {
    if (err instanceof SubdivisionError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    throw err;
  }
}
