-- Track-everything Phase 1 (prep PR): shared infrastructure for full raw API
-- payload preservation, engaged-vs-follower demographics split, and per-media
-- breakdown columns that platform-specific PRs will populate.
-- All changes are additive; no backfill required.

-- CreateEnum
CREATE TYPE "AudienceKind" AS ENUM ('FOLLOWER', 'ENGAGED');

-- AlterTable: extend MetricSnapshot with optional breakdown columns
ALTER TABLE "MetricSnapshot"
  ADD COLUMN "totalInteractions" INTEGER,
  ADD COLUMN "followsFromMedia"  INTEGER,
  ADD COLUMN "profileVisits"     INTEGER,
  ADD COLUMN "profileActivity"   JSONB,
  ADD COLUMN "reactionsByType"   JSONB;

-- AlterTable: extend AudienceSnapshot to support engaged-audience split, city
-- demographics, and a raw payload escape hatch
ALTER TABLE "AudienceSnapshot"
  ADD COLUMN "kind"   "AudienceKind" NOT NULL DEFAULT 'FOLLOWER',
  ADD COLUMN "cities" JSONB,
  ADD COLUMN "raw"    JSONB;

-- CreateIndex
CREATE INDEX "AudienceSnapshot_connectionType_connectionId_kind_capturedAt_idx"
  ON "AudienceSnapshot"("connectionType", "connectionId", "kind", "capturedAt");

-- CreateTable: 90-day raw API payload archive
CREATE TABLE "RawApiResponse" (
    "id"             TEXT             NOT NULL,
    "submissionId"   TEXT,
    "connectionType" "ConnectionType" NOT NULL,
    "connectionId"   TEXT             NOT NULL,
    "endpoint"       TEXT             NOT NULL,
    "capturedAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload"        JSONB            NOT NULL,

    CONSTRAINT "RawApiResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawApiResponse_submissionId_capturedAt_idx"
  ON "RawApiResponse"("submissionId", "capturedAt");
CREATE INDEX "RawApiResponse_connectionType_connectionId_capturedAt_idx"
  ON "RawApiResponse"("connectionType", "connectionId", "capturedAt");
CREATE INDEX "RawApiResponse_capturedAt_idx"
  ON "RawApiResponse"("capturedAt");
