-- Application: applicant civil status (État civil du propriétaire)
ALTER TABLE "Application" ADD COLUMN "applicant_father" TEXT;
ALTER TABLE "Application" ADD COLUMN "applicant_mother" TEXT;
ALTER TABLE "Application" ADD COLUMN "applicant_nationality" TEXT;
ALTER TABLE "Application" ADD COLUMN "applicant_birth_place" TEXT;
ALTER TABLE "Application" ADD COLUMN "applicant_birth_date" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN "applicant_profession" TEXT;
ALTER TABLE "Application" ADD COLUMN "marital_status" TEXT;
ALTER TABLE "Application" ADD COLUMN "matrimonial_regime" TEXT;

-- Parcel: nature & consistency, directional boundaries, developments
ALTER TABLE "Parcel" ADD COLUMN "nature" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "limit_north" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "limit_south" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "limit_east" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "limit_west" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "developments" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "dev_value" INTEGER;
ALTER TABLE "Parcel" ADD COLUMN "others_occupy" BOOLEAN;

-- ApplicationDocument: preserve the original uploaded filename for display
ALTER TABLE "ApplicationDocument" ADD COLUMN "original_name" TEXT;
