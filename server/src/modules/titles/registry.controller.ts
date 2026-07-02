import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

// GET /titles — registry view for officers (Livre Foncier consultation)
export async function listTitles(req: Request, res: Response): Promise<void> {
  const status = (req.query['status'] as string | undefined) ?? 'VALID';

  const titles = await prisma.title.findMany({
    where: { status },
    include: {
      parcel: {
        select: {
          id: true,
          division: true,
          sub_division: true,
          situation: true,
          plot_no: true,
          area_sqm: true,
        },
      },
      owners: { where: { is_current: true } },
      encumbrances: { where: { status: 'ACTIVE' } },
    },
    orderBy: { issued_at: 'desc' },
  });

  res.json(titles);
}

// GET /titles/:title_no/details — single title with owner history, encumbrances
// and the parcel geometry as GeoJSON (needed by the subdivision map)
export async function getTitleDetails(req: Request, res: Response): Promise<void> {
  const title_no = req.params['title_no'] as string;

  const title = await prisma.title.findUnique({
    where: { title_no },
    include: {
      parcel: true,
      owners: { orderBy: { is_current: 'desc' } },
      encumbrances: { orderBy: { recorded_at: 'desc' } },
    },
  });

  if (!title) {
    res.status(404).json({ message: 'Title not found' });
    return;
  }

  const geomRows = await prisma.$queryRaw<{ geojson: string | null }[]>`
    SELECT ST_AsGeoJSON(geom) AS geojson FROM "Parcel" WHERE id = ${title.parcel_id}::uuid
  `;
  const geometry = geomRows[0]?.geojson ? JSON.parse(geomRows[0].geojson) : null;

  res.json({ ...title, parcel: { ...title.parcel, geometry } });
}
