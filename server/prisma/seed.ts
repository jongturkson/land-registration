/// <reference types="node" />
import 'dotenv/config';
import argon2 from 'argon2';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = 'Password123!';

const ACCOUNTS = [
  {
    email: 'citizen@test.com',
    full_name: 'Jean-Pierre Mbango',
    role: 'citizen',
    region: 'fako',
  },
  {
    email: 'sdo@test.com',
    full_name: 'Chief Thomas Esunge',
    role: 'sub_divisional_officer',
    region: 'fako',
  },
  {
    email: 'surveyor@test.com',
    full_name: 'Brice Nkemdirim',
    role: 'surveyor',
    region: 'fako',
  },
  {
    email: 'delegate@test.com',
    full_name: 'Paul Ekane',
    role: 'divisional_delegate',
    region: 'fako',
  },
  {
    email: 'registrar@test.com',
    full_name: 'Marie-Claire Mballa',
    role: 'registrar',
    region: 'fako',
  },
];

async function main() {
  const hashed = await argon2.hash(TEST_PASSWORD);

  for (const account of ACCOUNTS) {
    const existing = await prisma.user.findFirst({ where: { email: account.email } });
    if (existing) {
      console.log(`  skip (exists)  ${existing.role.padEnd(26)} ${existing.email}`);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        email: account.email,
        full_name: account.full_name,
        role: account.role,
        region: account.region,
        hashed_password: hashed,
      },
    });
    console.log(`  created        ${user.role.padEnd(26)} ${user.email}`);
  }

  console.log(`\nAll accounts use password: ${TEST_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
