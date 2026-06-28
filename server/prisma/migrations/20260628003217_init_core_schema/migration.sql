-- CreateEnum
CREATE TYPE "AppType" AS ENUM ('DIRECT_REGISTRATION', 'PARTIAL_ALIENATION', 'TOTAL_ALIENATION', 'STATE_LAND', 'PARTITION', 'MORTGAGE', 'TRANSFORMATION');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIPTED', 'PUBLISHED', 'BOARD_SCHEDULED', 'SURVEYED', 'REGIONAL_REVIEW', 'OPPOSITION_WINDOW', 'CLEARED', 'TITLE_ISSUED', 'QUERIED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "id_card_no" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "AppType" NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "applicant_id" UUID NOT NULL,
    "parcel_id" UUID,
    "reference_no" TEXT,
    "fee_amount" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "verified_flag" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plot_no" TEXT,
    "block_no" TEXT,
    "division" TEXT NOT NULL,
    "sub_division" TEXT,
    "situation" TEXT,
    "limits" TEXT,
    "area_sqm" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "Parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostGIS extensions and geometry column
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
ALTER TABLE "Parcel" ADD COLUMN geom geometry(Polygon, 4326);
CREATE INDEX parcels_geom_gix ON "Parcel" USING GIST (geom);
