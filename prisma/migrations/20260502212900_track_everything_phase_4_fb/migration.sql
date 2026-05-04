-- Track-everything Phase 4 — Facebook Reels & video retention.
-- Adds VideoRetentionCurve. FB reaction-type breakdown and FB Reels
-- per-post metrics live inside MetricSnapshot.reactionsByType / .raw and
-- the Phase 1 raw escape hatch — no new columns needed.

-- CreateTable
CREATE TABLE "VideoRetentionCurve" (
    "id"           TEXT         NOT NULL,
    "submissionId" TEXT         NOT NULL,
    "capturedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source"       "MetricSource" NOT NULL,
    "curve"        JSONB        NOT NULL,

    CONSTRAINT "VideoRetentionCurve_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoRetentionCurve_submissionId_capturedAt_idx"
  ON "VideoRetentionCurve"("submissionId", "capturedAt");
