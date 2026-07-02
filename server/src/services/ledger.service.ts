import crypto from 'crypto';
import type { Prisma, AuditLog } from '../generated/prisma/client';

// Genesis sentinel used as prev_hash for the very first block in the chain
export const GENESIS_HASH = '00000000000000000000';

/**
 * Digital Livre Foncier — tamper-evident, append-only SHA-256 hash chain.
 *
 * Each AuditLog row stores the hash of the previous row (prev_hash) and its own
 * hash (self_hash) computed over the event data + prev_hash. Any retroactive
 * modification of a row breaks every subsequent link, which the integrity
 * checker (GET /audit/verify-chain) detects.
 */

// Canonical JSON: recursively sorts object keys so the serialization is
// identical before and after a Postgres jsonb round-trip (jsonb does not
// preserve key order). Arrays keep their order — it is significant.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .filter((key) => obj[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`);
  return `{${entries.join(',')}}`;
}

// Deterministic hash input — must match exactly in the chain verifier.
// The payload is normalized through JSON first (drops undefined, converts
// Dates to ISO strings — exactly what gets stored) and then canonicalized.
export function computeSelfHash(
  event: string,
  entity: string,
  entity_id: string,
  payload: unknown,
  prev_hash: string,
): string {
  const normalized: unknown = JSON.parse(JSON.stringify(payload ?? null));
  const data = event + entity + entity_id + canonicalize(normalized) + prev_hash;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Appends a new block to the hash chain. MUST be called with the same Prisma
 * transaction client as the business writes it records, so the ledger entry
 * commits (or rolls back) atomically with the event it describes.
 */
export async function appendLog(
  actor_id: string,
  actor_role: string,
  event: string,
  entity: string,
  entity_id: string,
  payload: Prisma.InputJsonValue,
  tx: Prisma.TransactionClient,
): Promise<AuditLog> {
  const lastEntry = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' } });
  const prev_hash = lastEntry?.self_hash ?? GENESIS_HASH;
  const self_hash = computeSelfHash(event, entity, entity_id, payload, prev_hash);

  return tx.auditLog.create({
    data: {
      actor_id,
      actor_role,
      event,
      entity,
      entity_id,
      payload,
      prev_hash,
      self_hash,
    },
  });
}
