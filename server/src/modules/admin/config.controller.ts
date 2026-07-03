import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';
import { getSystemSettings, invalidateSettingsCache } from '../../services/settings.service';

const UpdateSettingsSchema = z
  .object({
    current_taxation_rate: z
      .number()
      .min(0, 'Taxation rate cannot be negative')
      .max(100, 'Taxation rate cannot exceed 100%')
      .optional(),
    opposition_window_days: z
      .number()
      .int('Must be a whole number of days')
      .min(1, 'The opposition window must be at least 1 day')
      .max(365, 'The opposition window cannot exceed one year')
      .optional(),
    system_maintenance_mode: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one setting must be provided',
  });

// GET /admin/settings
export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json(await getSystemSettings());
}

// PUT /admin/settings
export async function updateSettings(req: Request, res: Response): Promise<void> {
  const parse = UpdateSettingsSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }

  const changes = parse.data;

  const settings = await prisma.$transaction(async (tx) => {
    const updated = await tx.systemSettings.upsert({
      where: { id: 1 },
      update: { ...changes, updated_by: req.user!.id },
      create: { id: 1, ...changes, updated_by: req.user!.id },
    });

    await appendLog(
      req.user!.id,
      req.user!.role,
      'SETTINGS_UPDATED',
      'SYSTEM_SETTINGS',
      '1',
      { changes },
      tx,
    );

    return updated;
  });

  invalidateSettingsCache();
  res.json({ message: 'Settings updated', settings });
}
