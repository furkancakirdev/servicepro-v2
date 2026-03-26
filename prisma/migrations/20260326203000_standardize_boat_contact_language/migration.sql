CREATE TYPE "ContactLanguage" AS ENUM ('TR', 'EN');

ALTER TABLE "BoatContact"
ADD COLUMN "language_new" "ContactLanguage" NOT NULL DEFAULT 'TR';

UPDATE "BoatContact"
SET "language_new" = CASE
  WHEN UPPER(TRIM(COALESCE("language", 'TR'))) = 'EN' THEN 'EN'::"ContactLanguage"
  ELSE 'TR'::"ContactLanguage"
END;

UPDATE "BoatContact"
SET "phone" = NULL
WHERE NULLIF(BTRIM(COALESCE("phone", '')), '') IS NULL;

UPDATE "BoatContact"
SET "email" = NULL
WHERE NULLIF(BTRIM(COALESCE("email", '')), '') IS NULL;

UPDATE "BoatContact"
SET "whatsappOptIn" = FALSE
WHERE "phone" IS NULL;

UPDATE "BoatContact"
SET "isPrimary" = FALSE
WHERE "phone" IS NULL
  AND "email" IS NULL;

ALTER TABLE "BoatContact" DROP COLUMN "language";
ALTER TABLE "BoatContact" RENAME COLUMN "language_new" TO "language";

ALTER TABLE "BoatContact"
ADD CONSTRAINT "BoatContact_phone_e164_check"
CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');

ALTER TABLE "BoatContact"
ADD CONSTRAINT "BoatContact_primary_channel_check"
CHECK (NOT "isPrimary" OR "phone" IS NOT NULL OR "email" IS NOT NULL);

ALTER TABLE "BoatContact"
ADD CONSTRAINT "BoatContact_whatsapp_phone_check"
CHECK (NOT "whatsappOptIn" OR "phone" IS NOT NULL);

CREATE INDEX "BoatContact_language_idx" ON "BoatContact"("language");
