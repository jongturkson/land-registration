-- Admin IAM & System Configuration
--
-- 1. User.department — the office/service an official is attached to.
-- 2. User.status — ACTIVE | SUSPENDED; suspended accounts cannot log in.
-- 3. SystemSettings — singleton row of dynamic global configuration.

ALTER TABLE "User" ADD COLUMN "department" TEXT;
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "SystemSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current_taxation_rate" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "opposition_window_days" INTEGER NOT NULL DEFAULT 30,
    "system_maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton so GET /admin/settings never has to special-case absence
INSERT INTO "SystemSettings" ("id") VALUES (1);
