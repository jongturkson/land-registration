import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { SurveySchema } from '../../shared/schemas/application.schema';

// POST /applications/:id/survey
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
    },
  });

  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  if (application.status !== 'PUBLISHED') {
    res.status(409).json({
      message: 'Survey can only be submitted for applications in PUBLISHED status',
    });
    return;
  }

  const geoJson = { type: 'Polygon', coordinates };

  await prisma.$transaction(async (tx) => {
    let parcelId = application.parcel_id;

    if (!parcelId) {
      const parcel = await tx.parcel.create({
        data: { division: application.applicant.region },
      });
      parcelId = parcel.id;
    }

    await tx.$executeRawUnsafe(
      'UPDATE "Parcel" SET geom = ST_GeomFromGeoJSON($1), status = $2 WHERE id = $3',
      JSON.stringify(geoJson),
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
        decision: `Parcel surveyed. Scale: ${scale}, Paper format: ${paper_format}.`,
      },
    });
  });

  res.json({ message: 'Survey submitted successfully' });
}
