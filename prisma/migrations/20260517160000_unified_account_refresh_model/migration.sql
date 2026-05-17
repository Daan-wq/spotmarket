-- Unify account refresh state across IG / TT / YT / FB and make account
-- snapshot counts platform-neutral.

CREATE TYPE "AccountRefreshStatus" AS ENUM ('NEVER_REFRESHED', 'REFRESHING', 'SUCCESS', 'FAILED');

ALTER TABLE "PlatformAccountSnapshot"
  RENAME COLUMN "followerCount" TO "audienceCount";

ALTER TABLE "CampaignSubmission"
  RENAME COLUMN "lastScrapedAt" TO "lastMetricsRefreshAt";

ALTER TABLE "CampaignSubmission"
  RENAME COLUMN "scrapeFailures" TO "metricsRefreshFailures";

ALTER TABLE "CreatorIgConnection"
  ADD COLUMN "accountRefreshStatus" "AccountRefreshStatus" NOT NULL DEFAULT 'NEVER_REFRESHED',
  ADD COLUMN "lastRefreshAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulRefreshAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshFailedAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshErrorCode" TEXT,
  ADD COLUMN "lastRefreshErrorMessage" TEXT;

ALTER TABLE "CreatorFbConnection"
  ADD COLUMN "accountRefreshStatus" "AccountRefreshStatus" NOT NULL DEFAULT 'NEVER_REFRESHED',
  ADD COLUMN "lastRefreshAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulRefreshAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshFailedAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshErrorCode" TEXT,
  ADD COLUMN "lastRefreshErrorMessage" TEXT;

ALTER TABLE "CreatorYtConnection"
  ADD COLUMN "accountRefreshStatus" "AccountRefreshStatus" NOT NULL DEFAULT 'NEVER_REFRESHED',
  ADD COLUMN "lastRefreshAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulRefreshAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshFailedAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshErrorCode" TEXT,
  ADD COLUMN "lastRefreshErrorMessage" TEXT;

ALTER TABLE "CreatorTikTokConnection"
  ADD COLUMN "accountRefreshStatus" "AccountRefreshStatus" NOT NULL DEFAULT 'NEVER_REFRESHED',
  ADD COLUMN "lastRefreshAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulRefreshAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshFailedAt" TIMESTAMP(3),
  ADD COLUMN "lastRefreshErrorCode" TEXT,
  ADD COLUMN "lastRefreshErrorMessage" TEXT;

INSERT INTO "PlatformAccountSnapshot" (
  "id",
  "connectionType",
  "connectionId",
  "capturedAt",
  "audienceCount",
  "isVerified",
  "raw"
)
SELECT
  concat('backfill_ig_', "id"),
  'IG'::"ConnectionType",
  "id",
  COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP),
  "followerCount",
  "isVerified",
  jsonb_build_object('source', 'connection_backfill')
FROM "CreatorIgConnection"
WHERE "isVerified" = true AND "followerCount" IS NOT NULL;

INSERT INTO "PlatformAccountSnapshot" (
  "id",
  "connectionType",
  "connectionId",
  "capturedAt",
  "audienceCount",
  "isVerified",
  "raw"
)
SELECT
  concat('backfill_fb_', "id"),
  'FB'::"ConnectionType",
  "id",
  COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP),
  "followerCount",
  "isVerified",
  jsonb_build_object('source', 'connection_backfill')
FROM "CreatorFbConnection"
WHERE "isVerified" = true AND "followerCount" IS NOT NULL;

INSERT INTO "PlatformAccountSnapshot" (
  "id",
  "connectionType",
  "connectionId",
  "capturedAt",
  "audienceCount",
  "isVerified",
  "raw"
)
SELECT
  concat('backfill_yt_', "id"),
  'YT'::"ConnectionType",
  "id",
  COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP),
  "subscriberCount",
  "isVerified",
  jsonb_build_object('source', 'connection_backfill')
FROM "CreatorYtConnection"
WHERE "isVerified" = true AND "subscriberCount" IS NOT NULL;

INSERT INTO "PlatformAccountSnapshot" (
  "id",
  "connectionType",
  "connectionId",
  "capturedAt",
  "audienceCount",
  "isVerified",
  "raw"
)
SELECT
  concat('backfill_tt_', "id"),
  'TT'::"ConnectionType",
  "id",
  COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP),
  "followerCount",
  "isVerified",
  jsonb_build_object('source', 'connection_backfill')
FROM "CreatorTikTokConnection"
WHERE "isVerified" = true AND "followerCount" IS NOT NULL;

UPDATE "CreatorIgConnection"
SET
  "accountRefreshStatus" = 'SUCCESS',
  "lastRefreshAttemptAt" = COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP),
  "lastSuccessfulRefreshAt" = COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP)
WHERE "followerCount" IS NOT NULL;

UPDATE "CreatorFbConnection"
SET
  "accountRefreshStatus" = 'SUCCESS',
  "lastRefreshAttemptAt" = COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP),
  "lastSuccessfulRefreshAt" = COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP)
WHERE "followerCount" IS NOT NULL;

UPDATE "CreatorYtConnection"
SET
  "accountRefreshStatus" = 'SUCCESS',
  "lastRefreshAttemptAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP),
  "lastSuccessfulRefreshAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "subscriberCount" IS NOT NULL;

UPDATE "CreatorTikTokConnection"
SET
  "accountRefreshStatus" = 'SUCCESS',
  "lastRefreshAttemptAt" = COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP),
  "lastSuccessfulRefreshAt" = COALESCE("lastCheckedAt", "verifiedAt", "updatedAt", CURRENT_TIMESTAMP)
WHERE "followerCount" IS NOT NULL;
