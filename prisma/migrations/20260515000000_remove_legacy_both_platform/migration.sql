-- Remove the legacy BOTH platform value now that campaigns can target explicit platforms.

UPDATE "Campaign"
SET "platforms" = array_remove("platforms", 'BOTH'::"Platform")
WHERE 'BOTH'::"Platform" = ANY("platforms");

UPDATE "PricingPackageTemplate"
SET "platforms" = array_remove("platforms", 'BOTH'::"Platform")
WHERE 'BOTH'::"Platform" = ANY("platforms");

ALTER TABLE "Campaign" ALTER COLUMN "platforms" DROP DEFAULT;
ALTER TABLE "PricingPackageTemplate" ALTER COLUMN "platforms" DROP DEFAULT;

ALTER TYPE "Platform" RENAME TO "Platform_old";
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK', 'X');

ALTER TABLE "Campaign"
  ALTER COLUMN "platforms" TYPE "Platform"[]
  USING "platforms"::text[]::"Platform"[];

ALTER TABLE "PricingPackageTemplate"
  ALTER COLUMN "platforms" TYPE "Platform"[]
  USING "platforms"::text[]::"Platform"[];

ALTER TABLE "Campaign" ALTER COLUMN "platforms" SET DEFAULT ARRAY[]::"Platform"[];
ALTER TABLE "PricingPackageTemplate" ALTER COLUMN "platforms" SET DEFAULT ARRAY[]::"Platform"[];

DROP TYPE "Platform_old";
