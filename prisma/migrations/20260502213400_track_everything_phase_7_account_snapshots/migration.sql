-- Track-everything Phase 7 — daily PlatformAccountSnapshot.
-- One row per verified connection per day so we can graph follower-count /
-- video-count trends without diffing connection rows.

-- CreateTable
CREATE TABLE "PlatformAccountSnapshot" (
    "id"              TEXT             NOT NULL,
    "connectionType"  "ConnectionType" NOT NULL,
    "connectionId"    TEXT             NOT NULL,
    "capturedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerCount"   INTEGER,
    "followingCount"  INTEGER,
    "totalLikes"      BIGINT,
    "videoCount"      INTEGER,
    "isVerified"      BOOLEAN,
    "raw"             JSONB,

    CONSTRAINT "PlatformAccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAccountSnapshot_connectionType_connectionId_capturedAt_idx"
  ON "PlatformAccountSnapshot"("connectionType", "connectionId", "capturedAt");
CREATE INDEX "PlatformAccountSnapshot_capturedAt_idx"
  ON "PlatformAccountSnapshot"("capturedAt");
