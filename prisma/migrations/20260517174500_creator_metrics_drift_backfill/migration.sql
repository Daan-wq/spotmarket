-- Idempotent corrective migration for production schema drift.
-- Preserves values from previous metric column names when present.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'CampaignSubmission'
  ) THEN
    ALTER TABLE "CampaignSubmission"
      ADD COLUMN IF NOT EXISTS "lastScrapedAt" TIMESTAMP(3);

    ALTER TABLE "CampaignSubmission"
      ADD COLUMN IF NOT EXISTS "scrapeFailures" INTEGER NOT NULL DEFAULT 0;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CampaignSubmission'
        AND column_name = 'lastMetricsRefreshAt'
    ) THEN
      EXECUTE 'UPDATE "CampaignSubmission"
        SET "lastScrapedAt" = "lastMetricsRefreshAt"
        WHERE "lastScrapedAt" IS NULL
          AND "lastMetricsRefreshAt" IS NOT NULL';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CampaignSubmission'
        AND column_name = 'last_metrics_refresh_at'
    ) THEN
      EXECUTE 'UPDATE "CampaignSubmission"
        SET "lastScrapedAt" = "last_metrics_refresh_at"
        WHERE "lastScrapedAt" IS NULL
          AND "last_metrics_refresh_at" IS NOT NULL';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CampaignSubmission'
        AND column_name = 'last_scraped_at'
    ) THEN
      EXECUTE 'UPDATE "CampaignSubmission"
        SET "lastScrapedAt" = "last_scraped_at"
        WHERE "lastScrapedAt" IS NULL
          AND "last_scraped_at" IS NOT NULL';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CampaignSubmission'
        AND column_name = 'metricsRefreshFailures'
    ) THEN
      EXECUTE 'UPDATE "CampaignSubmission"
        SET "scrapeFailures" = "metricsRefreshFailures"
        WHERE "scrapeFailures" = 0
          AND "metricsRefreshFailures" IS NOT NULL';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CampaignSubmission'
        AND column_name = 'metrics_refresh_failures'
    ) THEN
      EXECUTE 'UPDATE "CampaignSubmission"
        SET "scrapeFailures" = "metrics_refresh_failures"
        WHERE "scrapeFailures" = 0
          AND "metrics_refresh_failures" IS NOT NULL';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CampaignSubmission'
        AND column_name = 'scrape_failures'
    ) THEN
      EXECUTE 'UPDATE "CampaignSubmission"
        SET "scrapeFailures" = "scrape_failures"
        WHERE "scrapeFailures" = 0
          AND "scrape_failures" IS NOT NULL';
    END IF;

    UPDATE "CampaignSubmission"
    SET "scrapeFailures" = 0
    WHERE "scrapeFailures" IS NULL;

    ALTER TABLE "CampaignSubmission"
      ALTER COLUMN "scrapeFailures" SET DEFAULT 0,
      ALTER COLUMN "scrapeFailures" SET NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformAccountSnapshot" (
  "id" TEXT NOT NULL,
  "connectionType" "ConnectionType" NOT NULL,
  "connectionId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "followerCount" INTEGER,
  "followingCount" INTEGER,
  "totalLikes" BIGINT,
  "videoCount" INTEGER,
  "isVerified" BOOLEAN,
  "raw" JSONB,
  CONSTRAINT "PlatformAccountSnapshot_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "PlatformAccountSnapshot"
    ADD COLUMN IF NOT EXISTS "followerCount" INTEGER,
    ADD COLUMN IF NOT EXISTS "followingCount" INTEGER,
    ADD COLUMN IF NOT EXISTS "totalLikes" BIGINT,
    ADD COLUMN IF NOT EXISTS "videoCount" INTEGER,
    ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "raw" JSONB;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAccountSnapshot'
      AND column_name = 'audienceCount'
  ) THEN
    EXECUTE 'UPDATE "PlatformAccountSnapshot"
      SET "followerCount" = "audienceCount"
      WHERE "followerCount" IS NULL
        AND "audienceCount" IS NOT NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAccountSnapshot'
      AND column_name = 'follower_count'
  ) THEN
    EXECUTE 'UPDATE "PlatformAccountSnapshot"
      SET "followerCount" = "follower_count"
      WHERE "followerCount" IS NULL
        AND "follower_count" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAccountSnapshot'
      AND column_name = 'following_count'
  ) THEN
    EXECUTE 'UPDATE "PlatformAccountSnapshot"
      SET "followingCount" = "following_count"
      WHERE "followingCount" IS NULL
        AND "following_count" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAccountSnapshot'
      AND column_name = 'total_likes'
  ) THEN
    EXECUTE 'UPDATE "PlatformAccountSnapshot"
      SET "totalLikes" = "total_likes"
      WHERE "totalLikes" IS NULL
        AND "total_likes" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAccountSnapshot'
      AND column_name = 'video_count'
  ) THEN
    EXECUTE 'UPDATE "PlatformAccountSnapshot"
      SET "videoCount" = "video_count"
      WHERE "videoCount" IS NULL
        AND "video_count" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PlatformAccountSnapshot'
      AND column_name = 'is_verified'
  ) THEN
    EXECUTE 'UPDATE "PlatformAccountSnapshot"
      SET "isVerified" = "is_verified"
      WHERE "isVerified" IS NULL
        AND "is_verified" IS NOT NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PlatformAccountSnapshot_connectionType_connectionId_capturedAt_idx"
  ON "PlatformAccountSnapshot"("connectionType", "connectionId", "capturedAt");

CREATE INDEX IF NOT EXISTS "PlatformAccountSnapshot_capturedAt_idx"
  ON "PlatformAccountSnapshot"("capturedAt");
