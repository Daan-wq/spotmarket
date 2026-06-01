-- Campaign-level automatic bio gate for selected creator accounts.

ALTER TABLE "Campaign"
  ADD COLUMN "bioKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TYPE "CampaignApplicationConnectionStatus" AS ENUM ('VERIFIED', 'FAILED', 'SKIPPED');

CREATE TABLE "CampaignApplicationConnection" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "connectionType" "ConnectionType" NOT NULL,
  "connectionId" TEXT NOT NULL,
  "status" "CampaignApplicationConnectionStatus" NOT NULL DEFAULT 'VERIFIED',
  "lastCheckedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "missingKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CampaignApplicationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignApplicationConnection_applicationId_connectionType_connectionId_key"
  ON "CampaignApplicationConnection"("applicationId", "connectionType", "connectionId");

CREATE INDEX "CampaignApplicationConnection_connectionType_connectionId_idx"
  ON "CampaignApplicationConnection"("connectionType", "connectionId");

CREATE INDEX "CampaignApplicationConnection_status_idx"
  ON "CampaignApplicationConnection"("status");

ALTER TABLE "CampaignApplicationConnection"
  ADD CONSTRAINT "CampaignApplicationConnection_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "CampaignApplication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "BioCheckStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED');

ALTER TYPE "SubmissionStatus" ADD VALUE 'BIO_FAILED';

ALTER TABLE "CampaignSubmission"
  ADD COLUMN "bioCheckStatus" "BioCheckStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "bioCheckFailureReason" TEXT,
  ADD COLUMN "bioCheckedAt" TIMESTAMP(3);
