/**
 * One-time maintenance script: re-links the AuditLog hash chain using the
 * canonical ledger.service formula (event + entity + entity_id +
 * JSON.stringify(payload) + prev_hash, genesis "00000000000000000000").
 *
 * Needed once after migrating from the legacy inline hash format used by the
 * original issue-title controller. Run with:  npx tsx scripts/rechain-audit-log.ts
 */
import { prisma } from '../src/db/prisma';
import { computeSelfHash, GENESIS_HASH } from '../src/services/ledger.service';

async function main() {
  const logs = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });

  let prev_hash = GENESIS_HASH;
  let updated = 0;

  for (const log of logs) {
    const self_hash = computeSelfHash(log.event, log.entity, log.entity_id, log.payload, prev_hash);

    if (log.prev_hash !== prev_hash || log.self_hash !== self_hash) {
      await prisma.auditLog.update({
        where: { seq: log.seq },
        data: { prev_hash, self_hash },
      });
      updated++;
    }

    prev_hash = self_hash;
  }

  console.log(`Rechained ${updated} of ${logs.length} audit log entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
