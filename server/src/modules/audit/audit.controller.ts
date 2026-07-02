import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { computeSelfHash, GENESIS_HASH } from '../../services/ledger.service';

// AuditLog.seq is a BigInt — JSON.stringify cannot serialize it natively
function serializeLog(log: {
  seq: bigint;
  actor_id: string;
  actor_role: string;
  event: string;
  entity: string;
  entity_id: string;
  payload: unknown;
  occurred_at: Date;
  prev_hash: string | null;
  self_hash: string;
}) {
  return { ...log, seq: log.seq.toString() };
}

// GET /audit/logs — full ledger, oldest first (the chain order)
export async function listAuditLogs(_req: Request, res: Response): Promise<void> {
  const logs = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
  res.json(logs.map(serializeLog));
}

// GET /audit/verify-chain — recompute every block hash and verify the links
export async function verifyChain(_req: Request, res: Response): Promise<void> {
  const logs = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const block = logs[i]!;

    if (block.prev_hash !== expectedPrevHash) {
      res.json({
        isValid: false,
        brokenAtIndex: i,
        message: `Chain link broken at block ${block.seq.toString()}: prev_hash does not match the previous block's self_hash. The ledger may have been tampered with.`,
      });
      return;
    }

    const recomputed = computeSelfHash(
      block.event,
      block.entity,
      block.entity_id,
      block.payload,
      block.prev_hash,
    );

    if (recomputed !== block.self_hash) {
      res.json({
        isValid: false,
        brokenAtIndex: i,
        message: `Hash mismatch at block ${block.seq.toString()}: stored self_hash does not match the recomputed hash. Block contents have been altered.`,
      });
      return;
    }

    expectedPrevHash = block.self_hash;
  }

  res.json({
    isValid: true,
    brokenAtIndex: null,
    message: `Chain intact. All ${logs.length} block(s) verified — every hash matches and every link holds.`,
  });
}
