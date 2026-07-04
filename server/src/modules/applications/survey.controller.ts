import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { SurveySchema } from '../../shared/schemas/application.schema';
import { trackFor } from './workflow';

// POST /applications/:id/survey
//
// Two survey situations, enforced by the application's statutory track:
//  * FULL track (first registration) — file must be in PUBLISHED status. The
//    polygon is geometrically checked against every already-titled parcel: any
//    interior overlap hard-blocks the submission (no double-titling).
//  * CARVE_OUT track (partial alienation / partition) — file must be in
//    SURVEY_ORDERED status (commissioned by the Registrar). The child polygon
//    must lie entirely within the mother parcel's registered geometry.
//
// In both cases the parcel's area_sqm is recomputed from the polygon itself
// (geodesic area), so the register never depends on a hand-typed figure.
export async function submitSurvey(req: Request, res: Response): Promise<void> {
  const parse = SurveySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const id = req.params['id'] as string;
  const { coordinates, scale, paper_format, persons_present } = parse.data;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      applicant: { select: { region: true } },
      source_title: { select: { id: true, title_no: true, parcel_id: true } },
    },
  });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  const track = trackFor(application.type);
  const expectedStatus = track === 'CARVE_OUT' ? 'SURVEY_ORDERED' : 'PUBLISHED';
  if (application.status !== expectedStatus) {
    res.status(409).json({
      message:
        track === 'CARVE_OUT'
          ? 'Survey can only be submitted once the Registrar has commissioned it (SURVEY_ORDERED status)'
          : 'Survey can only be submitted for applications in PUBLISHED status',
    });
    return;
  }

  const geoJson = { type: 'Polygon', coordinates };
  const geoJsonStr = JSON.stringify(geoJson);

  // ── Spatial integrity checks (PostGIS) ─────────────────────────────────────
  if (track === 'CARVE_OUT') {
    // The child parcel must be carved from inside the mother parcel
    const motherParcelId = application.source_title?.parcel_id;
    if (!motherParcelId) {
      res.status(409).json({
        message: 'This application has no source (mother) title on record — cannot carve out.',
      });
      return;
    }

    const spatial = await prisma.$queryRaw<{ has_geom: boolean; within: boolean | null }[]>`
      SELECT geom IS NOT NULL AS has_geom,
             ST_Within(ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonStr}), 4326), geom) AS within
      FROM "Parcel"
      WHERE id = ${motherParcelId}::uuid
    `;
    const check = spatial[0];
    if (!check?.has_geom) {
      res.status(409).json({
        message:
          'The mother parcel has no registered geometry on file — the parent title must carry a survey before a portion can be detached.',
      });
      return;
    }
    if (!check.within) {
      res.status(409).json({
        message:
          'Spatial validation failed: the drawn child parcel falls outside the boundaries of the mother parcel. Redraw the polygon entirely inside the mother boundary.',
      });
      return;
    }
  } else {
    // First registration: hard-block any interior overlap with titled land.
    // Shared edges (adjacent parcels) are allowed — ST_Touches is excluded.
    const conflicts = await prisma.$queryRaw<{ title_no: string }[]>`
      SELECT t.title_no
      FROM "Title" t
      JOIN "Parcel" p ON p.id = t.parcel_id
      WHERE t.status = 'VALID'
        AND p.geom IS NOT NULL
        AND ST_Intersects(p.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonStr}), 4326))
        AND NOT ST_Touches(p.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonStr}), 4326))
      LIMIT 5
    `;
    if (conflicts.length > 0) {
      res.status(409).json({
        message: `Spatial validation failed: the drawn polygon overlaps already-titled land (${conflicts
          .map((c) => c.title_no)
          .join(', ')}). The register cannot double-title the same ground.`,
        conflicting_titles: conflicts.map((c) => c.title_no),
      });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    let parcelId = application.parcel_id;

    if (!parcelId) {
      const parcel = await tx.parcel.create({
        data: { division: application.applicant.region },
      });
      parcelId = parcel.id;
    }

    // Store the geometry and recompute the legal area from the polygon itself
    await tx.$executeRawUnsafe(
      `UPDATE "Parcel"
       SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
           status = $2,
           area_sqm = ROUND(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography)::numeric, 2)
       WHERE id = $3`,
      geoJsonStr,
      'SURVEYED',
      parcelId,
    );

    await tx.surveyReport.create({
      data: {
        application_id: id,
        surveyor_id: req.user!.id,
        paper_format,
        scale,
        vertices: geoJson,
        persons_present,
      },
    });

    await tx.application.update({
      where: { id },
      data: { status: 'SURVEYED', parcel_id: parcelId },
    });

    await tx.approval.create({
      data: {
        application_id: id,
        step: 'Survey Complete',
        actor_id: req.user!.id,
        role: req.user!.role,
        decision:
          track === 'CARVE_OUT'
            ? `Child parcel demarcated inside mother title ${application.source_title?.title_no}. Scale: ${scale}, Paper format: ${paper_format}.`
            : `Parcel surveyed. Scale: ${scale}, Paper format: ${paper_format}.`,
      },
    });
  });

  res.json({ message: 'Survey submitted successfully' });
}
