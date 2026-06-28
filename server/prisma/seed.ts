import 'dotenv/config';
import argon2 from 'argon2';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ROLE_NAMES = [
  'citizen',
  'sub_divisional_officer',
  'surveyor',
  'divisional_delegate',
  'regional_delegate',
  'registrar',
  'governor',
  'chief',
  'admin',
] as const;

const OFFICER_ROLES = ROLE_NAMES.filter((r) => r !== 'citizen');

function toTitleCase(snake: string) {
  return snake
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function main() {
  const hashedPassword = await argon2.hash('password123');

  // Roles — upsert so re-runs are safe
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`✔ Roles seeded (${ROLE_NAMES.length})`);

  // Remove previously seeded test users so the script is idempotent
  await prisma.user.deleteMany({ where: { email: { endsWith: '@landreg.test' } } });

  // One user per officer role
  for (const roleName of OFFICER_ROLES) {
    await prisma.user.create({
      data: {
        role: roleName,
        region: 'fako',
        hashed_password: hashedPassword,
        full_name: toTitleCase(roleName),
        email: `${roleName}@landreg.test`,
      },
    });
  }

  // Two citizen users
  for (let i = 1; i <= 2; i++) {
    await prisma.user.create({
      data: {
        role: 'citizen',
        region: 'fako',
        hashed_password: hashedPassword,
        full_name: `Citizen User ${i}`,
        email: `citizen${i}@landreg.test`,
      },
    });
  }

  console.log(`✔ Users seeded (${OFFICER_ROLES.length} officers + 2 citizens)`);
}

main()
  .then(() => {
    console.log('Seed complete.');
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
