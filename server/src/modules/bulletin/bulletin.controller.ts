import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

// GET /bulletins — public, no authentication required
export async function listBulletins(_req: Request, res: Response): Promise<void> {
  const entries = await prisma.bulletinEntry.findMany({
    orderBy: { date: 'desc' },
  });

  res.json(entries);
}
