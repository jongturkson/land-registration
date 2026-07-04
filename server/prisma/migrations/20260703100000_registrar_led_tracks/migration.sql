-- Registrar-led workflow redesign:
--  * MORTGAGE_RELEASE application type (mainlevée d'hypothèque)
--  * SURVEY_ORDERED / COMPLETED workflow statuses for the registrar-led tracks
--  * Application.source_title_id — the existing (mother) title an alienation,
--    partition, mortgage or mortgage release operates on
--  * Application mortgage fields (creditor / secured amount)
--  * Title ministerial-cancellation fields

-- New enum values
ALTER TYPE "AppType" ADD VALUE IF NOT EXISTS 'MORTGAGE_RELEASE';
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'SURVEY_ORDERED';
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Source (mother) title anchor + mortgage application data
ALTER TABLE "Application"
  ADD COLUMN "source_title_id" UUID,
  ADD COLUMN "mortgage_creditor" TEXT,
  ADD COLUMN "mortgage_amount" INTEGER;

ALTER TABLE "Application"
  ADD CONSTRAINT "Application_source_title_id_fkey"
  FOREIGN KEY ("source_title_id") REFERENCES "Title"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Application_source_title_id_idx" ON "Application"("source_title_id");

-- Ministerial cancellation of a title (registrar records the order reference)
ALTER TABLE "Title"
  ADD COLUMN "cancelled_at" TIMESTAMP(3),
  ADD COLUMN "cancellation_ref" TEXT;
