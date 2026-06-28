/*
  Warnings:

  - You are about to drop the column `geom` on the `Parcel` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "parcels_geom_gix";

-- AlterTable
ALTER TABLE "Parcel" DROP COLUMN "geom";

-- CreateTable
CREATE TABLE "Title" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_no" TEXT NOT NULL,
    "volume" TEXT,
    "folio" TEXT,
    "division" TEXT NOT NULL,
    "parcel_id" UUID NOT NULL,
    "nature" TEXT,
    "issued_by" UUID NOT NULL,
    "issued_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "certificate_pdf_path" TEXT,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitleOwner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "ancestors" TEXT,
    "birth_place" TEXT,
    "birth_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TitleOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encumbrance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "party" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleared_at" TIMESTAMP(3),

    CONSTRAINT "Encumbrance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyReport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "surveyor_id" UUID NOT NULL,
    "paper_format" TEXT,
    "scale" TEXT,
    "vertices" JSONB NOT NULL,
    "persons_present" JSONB NOT NULL,

    CONSTRAINT "SurveyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "step" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requester_info" JSONB NOT NULL,
    "title_no" TEXT NOT NULL,
    "fee_status" TEXT NOT NULL,
    "result" TEXT,
    "certificate_token" TEXT,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purpose" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "seq" BIGSERIAL NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prev_hash" TEXT,
    "self_hash" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "BulletinEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "BulletinEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Title_title_no_key" ON "Title"("title_no");

-- AddForeignKey
ALTER TABLE "Title" ADD CONSTRAINT "Title_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Title" ADD CONSTRAINT "Title_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleOwner" ADD CONSTRAINT "TitleOwner_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "Title"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encumbrance" ADD CONSTRAINT "Encumbrance_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "Title"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReport" ADD CONSTRAINT "SurveyReport_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReport" ADD CONSTRAINT "SurveyReport_surveyor_id_fkey" FOREIGN KEY ("surveyor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
