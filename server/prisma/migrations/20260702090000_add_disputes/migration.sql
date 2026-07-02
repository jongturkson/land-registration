-- Legal disputes (oppositions à immatriculation) filed against applications
-- during the statutory 30-day opposition window.

CREATE TYPE "DisputeStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'WITHDRAWN');

CREATE TABLE "Dispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "opponent_name" TEXT NOT NULL,
    "opponent_contact" TEXT,
    "grounds" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolution_notes" TEXT,
    "resolved_by" UUID,
    "filed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Dispute_application_id_idx" ON "Dispute"("application_id");

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_application_id_fkey"
    FOREIGN KEY ("application_id") REFERENCES "Application"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
