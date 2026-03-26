ALTER TABLE "ServiceJob"
ADD COLUMN "plannedStartAt" TIMESTAMP(3),
ADD COLUMN "plannedEndAt" TIMESTAMP(3),
ADD COLUMN "actualStartAt" TIMESTAMP(3),
ADD COLUMN "actualEndAt" TIMESTAMP(3),
ADD COLUMN "slaHours" INTEGER;

CREATE INDEX "ServiceJob_status_plannedStartAt_idx" ON "ServiceJob"("status", "plannedStartAt");
CREATE INDEX "ServiceJob_plannedEndAt_idx" ON "ServiceJob"("plannedEndAt");
CREATE INDEX "ServiceJob_actualStartAt_idx" ON "ServiceJob"("actualStartAt");
CREATE INDEX "ServiceJob_actualEndAt_idx" ON "ServiceJob"("actualEndAt");
