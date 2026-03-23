CREATE SEQUENCE "ServiceJob_jobNumber_seq";

ALTER TABLE "ServiceJob"
ADD COLUMN "jobNumber" INTEGER;

ALTER TABLE "ServiceJob"
ALTER COLUMN "jobNumber" SET DEFAULT nextval('"ServiceJob_jobNumber_seq"'::regclass);

UPDATE "ServiceJob"
SET "jobNumber" = nextval('"ServiceJob_jobNumber_seq"'::regclass)
WHERE "jobNumber" IS NULL;

ALTER TABLE "ServiceJob"
ALTER COLUMN "jobNumber" SET NOT NULL;

ALTER SEQUENCE "ServiceJob_jobNumber_seq" OWNED BY "ServiceJob"."jobNumber";
