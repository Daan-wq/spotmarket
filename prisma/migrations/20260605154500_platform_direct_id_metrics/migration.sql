-- CreateEnum
CREATE TYPE "MetricPollFailureReason" AS ENUM (
  'NO_CONNECTION',
  'NO_TOKEN',
  'TOKEN_EXPIRED',
  'TOKEN_BROKEN',
  'PERMISSION_DENIED',
  'API_SCHEMA_ERROR',
  'PLATFORM_ERROR',
  'UNSUPPORTED_PLATFORM',
  'POST_NOT_FOUND',
  'RATE_LIMITED'
);

-- AlterTable
ALTER TABLE "CampaignSubmission"
ADD COLUMN "platformApiMediaId" TEXT,
ADD COLUMN "platformMediaProductType" TEXT,
ADD COLUMN "lastMetricsErrorCode" "MetricPollFailureReason",
ADD COLUMN "lastMetricsErrorMessage" TEXT,
ADD COLUMN "lastMetricsErrorAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MetricPollFailure" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" "MetricPollFailureReason" NOT NULL,
  "httpStatus" INTEGER,
  "providerCode" INTEGER,
  "providerSubcode" INTEGER,
  "providerType" TEXT,
  "connectionType" "ConnectionType",
  "connectionId" TEXT,
  "message" TEXT NOT NULL,
  "raw" JSONB,

  CONSTRAINT "MetricPollFailure_pkey" PRIMARY KEY ("id")
);

-- Backfill direct API identities for platforms whose public URL id is canonical.
UPDATE "CampaignSubmission"
SET "platformApiMediaId" = "platformVideoId"
WHERE "platformApiMediaId" IS NULL
  AND "normalizedPlatform" IN ('TIKTOK', 'YOUTUBE', 'FACEBOOK')
  AND "platformVideoId" IS NOT NULL;

-- Backfill Instagram Graph media ids and media product types from the latest
-- successful metric payload. These payloads were already archived before this migration.
UPDATE "CampaignSubmission" AS submission
SET
  "platformApiMediaId" = (
    SELECT snapshot.raw->>'mediaId'
    FROM "MetricSnapshot" AS snapshot
    WHERE snapshot."submissionId" = submission.id
      AND snapshot.source = 'OAUTH_IG'
      AND snapshot.raw->>'mediaId' IS NOT NULL
    ORDER BY snapshot."capturedAt" DESC
    LIMIT 1
  ),
  "platformMediaProductType" = (
    SELECT COALESCE(snapshot.raw->>'mediaProductType', snapshot.raw->>'mediaType')
    FROM "MetricSnapshot" AS snapshot
    WHERE snapshot."submissionId" = submission.id
      AND snapshot.source = 'OAUTH_IG'
      AND snapshot.raw->>'mediaId' IS NOT NULL
    ORDER BY snapshot."capturedAt" DESC
    LIMIT 1
  )
WHERE submission."normalizedPlatform" = 'INSTAGRAM'
  AND submission."platformApiMediaId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "MetricSnapshot" AS snapshot
    WHERE snapshot."submissionId" = submission.id
      AND snapshot.source = 'OAUTH_IG'
      AND snapshot.raw->>'mediaId' IS NOT NULL
  );

-- Recover legacy Instagram source connections from archived API responses.
UPDATE "CampaignSubmission" AS submission
SET
  "sourceConnectionType" = 'IG',
  "sourceConnectionId" = (
    SELECT response."connectionId"
    FROM "RawApiResponse" AS response
    WHERE response."submissionId" = submission.id
      AND response."connectionType" = 'IG'
    ORDER BY response."capturedAt" DESC
    LIMIT 1
  )
WHERE submission."normalizedPlatform" = 'INSTAGRAM'
  AND submission."sourceConnectionId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "RawApiResponse" AS response
    WHERE response."submissionId" = submission.id
      AND response."connectionType" = 'IG'
  );

-- Schedule affected providers immediately while retaining the existing
-- hot/warm/cold scheduler rules for every subsequent attempt.
UPDATE "CampaignSubmission"
SET "nextMetricsPollAt" = CURRENT_TIMESTAMP
WHERE "normalizedPlatform" IN ('INSTAGRAM', 'FACEBOOK')
  AND status IN ('PENDING', 'APPROVED', 'FLAGGED');

-- CreateIndex
CREATE INDEX "CampaignSubmission_platformApiMediaId_idx"
ON "CampaignSubmission"("platformApiMediaId");

CREATE INDEX "CampaignSubmission_lastMetricsErrorCode_idx"
ON "CampaignSubmission"("lastMetricsErrorCode");

CREATE INDEX "MetricPollFailure_submissionId_attemptedAt_idx"
ON "MetricPollFailure"("submissionId", "attemptedAt");

CREATE INDEX "MetricPollFailure_reason_attemptedAt_idx"
ON "MetricPollFailure"("reason", "attemptedAt");

CREATE INDEX "MetricPollFailure_connectionType_connectionId_attemptedAt_idx"
ON "MetricPollFailure"("connectionType", "connectionId", "attemptedAt");

-- AddForeignKey
ALTER TABLE "MetricPollFailure"
ADD CONSTRAINT "MetricPollFailure_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "CampaignSubmission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
