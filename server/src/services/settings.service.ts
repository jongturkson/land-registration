import { prisma } from '../db/prisma';
import type { SystemSettings } from '../generated/prisma/client';

// Singleton SystemSettings row, cached in memory so the maintenance-mode
// middleware doesn't hit the database on every request. The cache is
// invalidated explicitly whenever the Admin saves new settings.

const CACHE_TTL_MS = 15_000;

let cached: SystemSettings | null = null;
let cachedAt = 0;

export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;

  // upsert guards against a missing singleton row (e.g. a fresh database)
  cached = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  cachedAt = now;
  return cached;
}

export function invalidateSettingsCache(): void {
  cached = null;
  cachedAt = 0;
}
