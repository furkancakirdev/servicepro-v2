ALTER TABLE "ServiceJob"
ADD COLUMN "dispatchDate" TIMESTAMP(3);

UPDATE "ServiceJob"
SET "dispatchDate" = DATE_TRUNC('day', COALESCE("plannedStartAt", "createdAt"));

CREATE INDEX "ServiceJob_dispatchDate_status_idx" ON "ServiceJob"("dispatchDate", "status");
