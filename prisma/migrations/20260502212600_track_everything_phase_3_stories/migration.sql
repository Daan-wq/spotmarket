-- Track-everything Phase 3: Instagram Stories capture and reel correlation.
-- Stories expire 24h after posting; the poll-stories cron snapshots them within
-- the live window. StoryReelCorrelation links nearby reels for engagement
-- correlation analysis.

-- CreateTable
CREATE TABLE "StoryPost" (
    "id"                TEXT         NOT NULL,
    "connectionId"      TEXT         NOT NULL,
    "mediaId"           TEXT         NOT NULL,
    "postedAt"          TIMESTAMP(3) NOT NULL,
    "expiresAt"         TIMESTAMP(3),
    "mediaType"         TEXT         NOT NULL,
    "mediaProductType"  TEXT         NOT NULL,
    "permalink"         TEXT,
    "reach"             INTEGER,
    "views"             INTEGER,
    "replies"           INTEGER,
    "follows"           INTEGER,
    "profileVisits"     INTEGER,
    "totalInteractions" INTEGER,
    "shares"            INTEGER,
    "tapsForward"       INTEGER,
    "tapsBack"          INTEGER,
    "tapsExit"          INTEGER,
    "swipeForward"      INTEGER,
    "profileActivity"   JSONB,
    "lastPolledAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw"               JSONB,

    CONSTRAINT "StoryPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryPost_mediaId_key" ON "StoryPost"("mediaId");
CREATE INDEX "StoryPost_connectionId_postedAt_idx" ON "StoryPost"("connectionId", "postedAt");
CREATE INDEX "StoryPost_postedAt_idx" ON "StoryPost"("postedAt");

-- CreateTable
CREATE TABLE "StoryReelCorrelation" (
    "id"           TEXT         NOT NULL,
    "storyId"      TEXT         NOT NULL,
    "submissionId" TEXT         NOT NULL,
    "deltaMinutes" INTEGER      NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReelCorrelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryReelCorrelation_storyId_submissionId_key"
  ON "StoryReelCorrelation"("storyId", "submissionId");
CREATE INDEX "StoryReelCorrelation_submissionId_idx" ON "StoryReelCorrelation"("submissionId");
CREATE INDEX "StoryReelCorrelation_storyId_idx" ON "StoryReelCorrelation"("storyId");

-- AddForeignKey
ALTER TABLE "StoryReelCorrelation"
  ADD CONSTRAINT "StoryReelCorrelation_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "StoryPost"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
