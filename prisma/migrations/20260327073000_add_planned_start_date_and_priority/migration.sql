ALTER TABLE "ServiceJob"
ADD COLUMN IF NOT EXISTS "plannedStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';

UPDATE "ServiceJob"
SET "plannedStartDate" = DATE_TRUNC('day', COALESCE("plannedStartAt", "dispatchDate", "createdAt"))
WHERE "plannedStartDate" IS NULL;

CREATE INDEX IF NOT EXISTS "ServiceJob_status_plannedStartDate_idx"
ON "ServiceJob"("status", "plannedStartDate");

CREATE INDEX IF NOT EXISTS "ServiceJob_priority_plannedStartDate_idx"
ON "ServiceJob"("priority", "plannedStartDate");
