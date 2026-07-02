import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

interface ParcelGeoRow {
  parcel_id: string;
  title_no: string;
  owner: string | null;
  area_sqm: string | null;
  geojson: string;
}

// GET /analytics/dashboard — aggregated KPIs for the admin dashboard
export async function getDashboardAnalytics(_req: Request, res: Response): Promise<void> {
  const [applicationsByStatus, activeDisputes, validTitles, parcelRows] = await Promise.all([
    prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.dispute.count({ where: { status: 'ACTIVE' } }),
    prisma.title.count({ where: { status: 'VALID' } }),
    prisma.$queryRaw<ParcelGeoRow[]>`
      SELECT p.id            AS parcel_id,
             t.title_no      AS title_no,
             o.full_name     AS owner,
             p.area_sqm::text AS area_sqm,
             ST_AsGeoJSON(p.geom) AS geojson
      FROM "Parcel" p
      JOIN "Title" t ON t.parcel_id = p.id AND t.status = 'VALID'
      LEFT JOIN "TitleOwner" o ON o.title_id = t.id AND o.is_current = true
      WHERE p.geom IS NOT NULL
    `,
  ]);

  res.json({
    applications_by_status: applicationsByStatus.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
    active_disputes: activeDisputes,
    valid_titles: validTitles,
    parcels: parcelRows.map((row) => ({
      parcel_id: row.parcel_id,
      title_no: row.title_no,
      owner: row.owner,
      area_sqm: row.area_sqm,
      geometry: JSON.parse(row.geojson),
    })),
  });
}
