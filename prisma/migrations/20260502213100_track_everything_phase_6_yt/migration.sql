-- Track-everything Phase 6 — YouTube Channel Analytics persistence.
-- Replaces the Analytics API data we used to compute on-demand and discard.

-- CreateTable
CREATE TABLE "YtDailyChannelInsight" (
    "id"                         TEXT             NOT NULL,
    "connectionId"               TEXT             NOT NULL,
    "date"                       DATE             NOT NULL,
    "views"                      BIGINT           NOT NULL,
    "engagedViews"               BIGINT,
    "estimatedMinutesWatched"    INTEGER          NOT NULL,
    "averageViewDuration"        INTEGER          NOT NULL,
    "averageViewPercentage"      DOUBLE PRECISION,
    "subscribersGained"          INTEGER          NOT NULL,
    "subscribersLost"            INTEGER          NOT NULL,
    "likes"                      INTEGER          NOT NULL,
    "comments"                   INTEGER          NOT NULL,
    "shares"                     INTEGER          NOT NULL,
    "redViews"                   BIGINT,
    "estimatedRedMinutesWatched" INTEGER,
    "trafficSourceBreakdown"     JSONB,
    "playbackLocationBreakdown"  JSONB,
    "deviceTypeBreakdown"        JSONB,
    "contentTypeBreakdown"       JSONB,
    "subscribedStatusBreakdown"  JSONB,
    "raw"                        JSONB,

    CONSTRAINT "YtDailyChannelInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YtDailyChannelInsight_connectionId_date_key"
  ON "YtDailyChannelInsight"("connectionId", "date");
CREATE INDEX "YtDailyChannelInsight_connectionId_date_idx"
  ON "YtDailyChannelInsight"("connectionId", "date");
