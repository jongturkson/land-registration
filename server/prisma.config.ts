/// <reference types="node" />
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
  // Route the CLI (migrate/db execute) through the pg driver. Prisma's own
  // engine cannot complete the TLS handshake with Neon's proxy, while pg
  // (which the app itself uses via PrismaPg) connects fine.
  adapter: async () => {
    return new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
  },
});
