-- Site usage analytics rollups from PostHog.
-- Stores compact hourly/daily snapshots so the admin dashboard does not query
-- PostHog live on every page load.

-- CreateTable
CREATE TABLE "SiteAnalyticsSnapshot" (
    "id"           TEXT         NOT NULL,
    "granularity"  TEXT         NOT NULL,
    "segment"      TEXT         NOT NULL DEFAULT 'non_admin',
    "periodStart"  TIMESTAMP(3) NOT NULL,
    "periodEnd"    TIMESTAMP(3) NOT NULL,
    "metrics"      JSONB        NOT NULL DEFAULT '{}',
    "topPages"     JSONB        NOT NULL DEFAULT '[]',
    "referrers"    JSONB        NOT NULL DEFAULT '[]',
    "funnel"       JSONB        NOT NULL DEFAULT '[]',
    "recordings"   JSONB        NOT NULL DEFAULT '[]',
    "syncedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteAnalyticsSnapshot_granularity_segment_periodStart_key"
  ON "SiteAnalyticsSnapshot"("granularity", "segment", "periodStart");

CREATE INDEX "SiteAnalyticsSnapshot_granularity_segment_periodStart_idx"
  ON "SiteAnalyticsSnapshot"("granularity", "segment", "periodStart");

CREATE INDEX "SiteAnalyticsSnapshot_periodStart_idx"
  ON "SiteAnalyticsSnapshot"("periodStart");
