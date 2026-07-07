import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

// GET /bulletins — public, no authentication required.
// Each notice is joined to its application so the public sees the statutory
// content of an avis de clôture de bornage: who claims the land, where it is,
// its size, nature and boundaries — enough to decide whether to oppose.
export async function listBulletins(_req: Request, res: Response): Promise<void> {
  const entries = await prisma.bulletinEntry.findMany({
    orderBy: { date: 'desc' },
  });

  const references = entries.map((e) => e.reference);
  const applications = await prisma.application.findMany({
    where: { reference_no: { in: references } },
    select: {
      reference_no: true,
      type: true,
      status: true,
      applicant: { select: { full_name: true } },
      parcel: {
        select: {
          division: true,
          sub_division: true,
          situation: true,
          plot_no: true,
          block_no: true,
          area_sqm: true,
          nature: true,
          limit_north: true,
          limit_south: true,
          limit_east: true,
          limit_west: true,
        },
      },
    },
  });
  const byReference = new Map(applications.map((a) => [a.reference_no, a]));

  res.json(
    entries.map((entry) => {
      const application = byReference.get(entry.reference);
      return {
        ...entry,
        application: application
          ? {
              type: application.type,
              status: application.status,
              // Opposition is only receivable while the statutory window is open
              opposition_open: application.status === 'OPPOSITION_WINDOW',
              claimant: application.applicant.full_name,
              parcel: application.parcel,
            }
          : null,
      };
    }),
  );
}
