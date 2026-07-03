-- Integrity & de-duplication pass (audit directive 2)
--
-- 1. Unique constraints: application reference numbers, user email (login
--    identifier) and national ID card number must be unambiguous.
-- 2. Indices on every foreign key / lookup column used by the queue queries.
-- 3. Drop the dead "Role" table — roles live on User.role and in the Casbin
--    policy; the table was never referenced and duplicated that source of truth.
-- 4. Drop legacy Parcel.limits — superseded by limit_north/south/east/west.
-- 5. Timestamps on Payment and VerificationRequest for auditability.

-- Unique constraints
CREATE UNIQUE INDEX "Application_reference_no_key" ON "Application"("reference_no");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_id_card_no_key" ON "User"("id_card_no");

-- Foreign-key / queue-query indices
CREATE INDEX "Application_applicant_id_idx" ON "Application"("applicant_id");
CREATE INDEX "Application_parcel_id_idx" ON "Application"("parcel_id");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Dispute_application_id_status_idx" ON "Dispute"("application_id", "status");
CREATE INDEX "ApplicationDocument_application_id_idx" ON "ApplicationDocument"("application_id");
CREATE INDEX "Title_parcel_id_idx" ON "Title"("parcel_id");
CREATE INDEX "TitleOwner_title_id_is_current_idx" ON "TitleOwner"("title_id", "is_current");
CREATE INDEX "Encumbrance_title_id_status_idx" ON "Encumbrance"("title_id", "status");
CREATE INDEX "SurveyReport_application_id_idx" ON "SurveyReport"("application_id");
CREATE INDEX "Approval_application_id_idx" ON "Approval"("application_id");
CREATE INDEX "AuditLog_entity_entity_id_idx" ON "AuditLog"("entity", "entity_id");
CREATE INDEX "BulletinEntry_reference_idx" ON "BulletinEntry"("reference");
CREATE INDEX "VerificationRequest_title_no_idx" ON "VerificationRequest"("title_no");

-- De-duplication: dead table and legacy column
DROP TABLE IF EXISTS "Role";
ALTER TABLE "Parcel" DROP COLUMN IF EXISTS "limits";

-- Auditability timestamps
ALTER TABLE "Payment" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "VerificationRequest" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
