-- CreateEnum
CREATE TYPE "LogoStatus" AS ENUM ('PENDING', 'PRESENT', 'MISSING');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('OAUTH_IG', 'OAUTH_TT', 'OAUTH_YT', 'OAUTH_FB', 'OAUTH_FAILED');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('VELOCITY_SPIKE', 'VELOCITY_DROP', 'RATIO_ANOMALY', 'BOT_SUSPECTED', 'LOGO_MISSING', 'DUPLICATE', 'TOKEN_BROKEN');

-- CreateEnum
CREATE TYPE "SignalSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('IG', 'TT', 'YT', 'FB');

-- CreateEnum
CREATE TYPE "DemographicSource" AS ENUM ('PLATFORM_API', 'SELF_REPORT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'DISCORD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PERFORMANCE_VIRAL';
ALTER TYPE "NotificationType" ADD VALUE 'PERFORMANCE_UNDERPERFORM';
ALTER TYPE "NotificationType" ADD VALUE 'EARNINGS_MILESTONE';
ALTER TYPE "NotificationType" ADD VALUE 'SIGNAL_FLAGGED';
ALTER TYPE "NotificationType" ADD VALUE 'TOKEN_BROKEN';

-- AlterTable
ALTER TABLE "CampaignSubmission" ADD COLUMN     "logoStatus" "LogoStatus",
ADD COLUMN     "logoVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "logoVerifiedBy" TEXT,
ADD COLUMN     "trustScore" DOUBLE PRECISION,
ADD COLUMN     "velocityScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "MetricSource" NOT NULL,
    "viewCount" BIGINT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER,
    "watchTimeSec" INTEGER,
    "reachCount" INTEGER,
    "raw" JSONB,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionSignal" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "severity" "SignalSeverity" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "SubmissionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceSnapshot" (
    "id" TEXT NOT NULL,
    "connectionType" "ConnectionType" NOT NULL,
    "connectionId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "DemographicSource" NOT NULL,
    "ageBuckets" JSONB NOT NULL,
    "genderSplit" JSONB NOT NULL,
    "topCountries" JSONB NOT NULL,
    "totalReach" INTEGER,

    CONSTRAINT "AudienceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClipperPerformanceScore" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL,
    "approvalRate" DOUBLE PRECISION NOT NULL,
    "benchmarkRatio" DOUBLE PRECISION NOT NULL,
    "trustScore" DOUBLE PRECISION NOT NULL,
    "deliveryScore" DOUBLE PRECISION NOT NULL,
    "audienceFit" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "payload" JSONB,

    CONSTRAINT "ClipperPerformanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignBenchmark" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "velocityP10" DOUBLE PRECISION NOT NULL,
    "velocityP50" DOUBLE PRECISION NOT NULL,
    "velocityP90" DOUBLE PRECISION NOT NULL,
    "likeRatioP50" DOUBLE PRECISION NOT NULL,
    "likeRatioP90" DOUBLE PRECISION NOT NULL,
    "commentRatioP50" DOUBLE PRECISION NOT NULL,
    "commentRatioP90" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "windowHours" INTEGER NOT NULL,
    "payload" JSONB,

    CONSTRAINT "CampaignBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channels" "NotificationChannel"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricSnapshot_submissionId_capturedAt_idx" ON "MetricSnapshot"("submissionId", "capturedAt");

-- CreateIndex
CREATE INDEX "MetricSnapshot_source_idx" ON "MetricSnapshot"("source");

-- CreateIndex
CREATE INDEX "SubmissionSignal_submissionId_type_idx" ON "SubmissionSignal"("submissionId", "type");

-- CreateIndex
CREATE INDEX "SubmissionSignal_severity_createdAt_idx" ON "SubmissionSignal"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "SubmissionSignal_resolvedAt_idx" ON "SubmissionSignal"("resolvedAt");

-- CreateIndex
CREATE INDEX "AudienceSnapshot_connectionType_connectionId_capturedAt_idx" ON "AudienceSnapshot"("connectionType", "connectionId", "capturedAt");

-- CreateIndex
CREATE INDEX "ClipperPerformanceScore_creatorProfileId_computedAt_idx" ON "ClipperPerformanceScore"("creatorProfileId", "computedAt");

-- CreateIndex
CREATE INDEX "ClipperPerformanceScore_score_idx" ON "ClipperPerformanceScore"("score");

-- CreateIndex
CREATE INDEX "CampaignBenchmark_campaignId_computedAt_idx" ON "CampaignBenchmark"("campaignId", "computedAt");

-- CreateIndex
CREATE INDEX "NotificationRule_userId_idx" ON "NotificationRule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRule_userId_type_key" ON "NotificationRule"("userId", "type");

-- CreateIndex
CREATE INDEX "CampaignSubmission_logoStatus_idx" ON "CampaignSubmission"("logoStatus");

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CampaignSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionSignal" ADD CONSTRAINT "SubmissionSignal_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CampaignSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

