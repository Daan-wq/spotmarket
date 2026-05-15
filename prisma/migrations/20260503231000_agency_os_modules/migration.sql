-- Agency OS modules: CRM, onboarding, clipper ops, production, QC, payout runs, SOPs.

ALTER TYPE "SubmissionStatus" ADD VALUE 'NEEDS_REVISION';

CREATE TYPE "BrandStatus" AS ENUM ('PROSPECT', 'ONBOARDING', 'ACTIVE', 'PAUSED', 'CHURNED');
CREATE TYPE "BrandLeadStage" AS ENUM ('LEAD', 'CONTACTED', 'REPLIED', 'CALL_BOOKED', 'CALL_DONE', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'NURTURE_LATER');
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ClipperStatus" AS ENUM ('APPLICANT', 'TRIAL_SENT', 'TRIAL_SUBMITTED', 'APPROVED', 'ACTIVE', 'PAUSED', 'REMOVED');
CREATE TYPE "ClipperReliability" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ClipperCandidateStage" AS ENUM ('FOUND', 'CONTACTED', 'PORTFOLIO_RECEIVED', 'TRIAL_SENT', 'TRIAL_SUBMITTED', 'APPROVED', 'REJECTED', 'ADDED_TO_DATABASE');
CREATE TYPE "ProductionAssignmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'POSTED', 'REJECTED', 'PAID');
CREATE TYPE "QcDecision" AS ENUM ('APPROVED', 'REVISION', 'REJECTED');
CREATE TYPE "PayoutRunStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PROCESSING', 'SENT', 'CONFIRMED');
CREATE TYPE "SopCategory" AS ENUM ('SALES', 'BRAND_ONBOARDING', 'CLIPPER_RECRUITMENT', 'PRODUCTION', 'QC', 'PAYOUTS', 'REPORTING');
CREATE TYPE "SopStatus" AS ENUM ('DRAFT', 'ACTIVE', 'NEEDS_REVIEW', 'ARCHIVED');

CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "niche" TEXT,
  "website" TEXT,
  "instagramHandle" TEXT,
  "tiktokHandle" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "status" "BrandStatus" NOT NULL DEFAULT 'PROSPECT',
  "owner" TEXT,
  "monthlyValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandLead" (
  "id" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "source" TEXT,
  "stage" "BrandLeadStage" NOT NULL DEFAULT 'LEAD',
  "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
  "owner" TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "estimatedValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "probability" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "convertedBrandId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandOnboarding" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "packageName" TEXT,
  "monthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "contractSigned" BOOLEAN NOT NULL DEFAULT false,
  "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
  "kickoffCallDone" BOOLEAN NOT NULL DEFAULT false,
  "brandBriefReceived" BOOLEAN NOT NULL DEFAULT false,
  "contentExamplesReceived" BOOLEAN NOT NULL DEFAULT false,
  "driveFolderCreated" BOOLEAN NOT NULL DEFAULT false,
  "targetAudience" TEXT,
  "mainProductOrService" TEXT,
  "hooksAngles" TEXT,
  "dosAndDonts" TEXT,
  "assignedClipperIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "startDate" TIMESTAMP(3),
  "accountManager" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClipperOperationalProfile" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "status" "ClipperStatus" NOT NULL DEFAULT 'APPLICANT',
  "reliability" "ClipperReliability" NOT NULL DEFAULT 'UNKNOWN',
  "maxClipsPerWeek" INTEGER,
  "ratePerClip" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "editingStyle" TEXT,
  "niches" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "assignedBrandIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClipperOperationalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClipperCandidate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" TEXT,
  "contact" TEXT,
  "portfolioUrl" TEXT,
  "stage" "ClipperCandidateStage" NOT NULL DEFAULT 'FOUND',
  "contactedBy" TEXT,
  "trialSentAt" TIMESTAMP(3),
  "trialDueAt" TIMESTAMP(3),
  "trialSubmittedAt" TIMESTAMP(3),
  "score" INTEGER,
  "approvedCreatorProfileId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClipperCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionAssignment" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "brandId" TEXT,
  "creatorProfileId" TEXT,
  "contentAngle" TEXT,
  "sourceUrl" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "status" "ProductionAssignmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "revisionNotes" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QcReview" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "hookScore" INTEGER,
  "pacingScore" INTEGER,
  "captionsScore" INTEGER,
  "brandFitScore" INTEGER,
  "logoPresent" BOOLEAN,
  "noSpellingMistakes" BOOLEAN NOT NULL DEFAULT false,
  "correctFormat" BOOLEAN NOT NULL DEFAULT false,
  "audioQuality" BOOLEAN NOT NULL DEFAULT false,
  "ctaIncluded" BOOLEAN NOT NULL DEFAULT false,
  "decision" "QcDecision" NOT NULL DEFAULT 'REVISION',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QcReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutRun" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "PayoutRunStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "totalGross" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalNet" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "proofUrl" TEXT,
  "createdBy" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutRunItem" (
  "id" TEXT NOT NULL,
  "payoutRunId" TEXT NOT NULL,
  "creatorProfileId" TEXT,
  "submissionId" TEXT,
  "productionAssignmentId" TEXT,
  "approvedClips" INTEGER NOT NULL DEFAULT 0,
  "ratePerClip" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutRunItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SopDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "SopCategory" NOT NULL,
  "status" "SopStatus" NOT NULL DEFAULT 'DRAFT',
  "owner" TEXT,
  "summary" TEXT,
  "body" TEXT NOT NULL,
  "lastReviewedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SopDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Campaign" ADD COLUMN "brandId" TEXT;
ALTER TABLE "CampaignSubmission" ADD COLUMN "productionAssignmentId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "payoutRunId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "payoutRunItemId" TEXT;

CREATE UNIQUE INDEX "BrandOnboarding_brandId_key" ON "BrandOnboarding"("brandId");
CREATE UNIQUE INDEX "ClipperOperationalProfile_creatorProfileId_key" ON "ClipperOperationalProfile"("creatorProfileId");
CREATE UNIQUE INDEX "CampaignSubmission_productionAssignmentId_key" ON "CampaignSubmission"("productionAssignmentId");
CREATE UNIQUE INDEX "Payout_payoutRunItemId_key" ON "Payout"("payoutRunItemId");

CREATE INDEX "Brand_status_idx" ON "Brand"("status");
CREATE INDEX "Brand_owner_idx" ON "Brand"("owner");
CREATE INDEX "BrandLead_stage_idx" ON "BrandLead"("stage");
CREATE INDEX "BrandLead_priority_idx" ON "BrandLead"("priority");
CREATE INDEX "BrandLead_nextFollowUpAt_idx" ON "BrandLead"("nextFollowUpAt");
CREATE INDEX "BrandLead_convertedBrandId_idx" ON "BrandLead"("convertedBrandId");
CREATE INDEX "BrandOnboarding_accountManager_idx" ON "BrandOnboarding"("accountManager");
CREATE INDEX "BrandOnboarding_startDate_idx" ON "BrandOnboarding"("startDate");
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");
CREATE INDEX "CampaignSubmission_productionAssignmentId_idx" ON "CampaignSubmission"("productionAssignmentId");
CREATE INDEX "ClipperOperationalProfile_status_idx" ON "ClipperOperationalProfile"("status");
CREATE INDEX "ClipperOperationalProfile_reliability_idx" ON "ClipperOperationalProfile"("reliability");
CREATE INDEX "ClipperCandidate_stage_idx" ON "ClipperCandidate"("stage");
CREATE INDEX "ClipperCandidate_trialDueAt_idx" ON "ClipperCandidate"("trialDueAt");
CREATE INDEX "ClipperCandidate_approvedCreatorProfileId_idx" ON "ClipperCandidate"("approvedCreatorProfileId");
CREATE INDEX "ProductionAssignment_campaignId_idx" ON "ProductionAssignment"("campaignId");
CREATE INDEX "ProductionAssignment_brandId_idx" ON "ProductionAssignment"("brandId");
CREATE INDEX "ProductionAssignment_creatorProfileId_idx" ON "ProductionAssignment"("creatorProfileId");
CREATE INDEX "ProductionAssignment_status_idx" ON "ProductionAssignment"("status");
CREATE INDEX "ProductionAssignment_dueAt_idx" ON "ProductionAssignment"("dueAt");
CREATE INDEX "QcReview_submissionId_idx" ON "QcReview"("submissionId");
CREATE INDEX "QcReview_decision_idx" ON "QcReview"("decision");
CREATE INDEX "Payout_payoutRunId_idx" ON "Payout"("payoutRunId");
CREATE INDEX "PayoutRun_status_idx" ON "PayoutRun"("status");
CREATE INDEX "PayoutRun_periodStart_periodEnd_idx" ON "PayoutRun"("periodStart", "periodEnd");
CREATE INDEX "PayoutRunItem_payoutRunId_idx" ON "PayoutRunItem"("payoutRunId");
CREATE INDEX "PayoutRunItem_creatorProfileId_idx" ON "PayoutRunItem"("creatorProfileId");
CREATE INDEX "PayoutRunItem_submissionId_idx" ON "PayoutRunItem"("submissionId");
CREATE INDEX "PayoutRunItem_productionAssignmentId_idx" ON "PayoutRunItem"("productionAssignmentId");
CREATE INDEX "SopDocument_category_idx" ON "SopDocument"("category");
CREATE INDEX "SopDocument_status_idx" ON "SopDocument"("status");
CREATE INDEX "SopDocument_nextReviewAt_idx" ON "SopDocument"("nextReviewAt");

ALTER TABLE "BrandLead" ADD CONSTRAINT "BrandLead_convertedBrandId_fkey" FOREIGN KEY ("convertedBrandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrandOnboarding" ADD CONSTRAINT "BrandOnboarding_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignSubmission" ADD CONSTRAINT "CampaignSubmission_productionAssignmentId_fkey" FOREIGN KEY ("productionAssignmentId") REFERENCES "ProductionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClipperOperationalProfile" ADD CONSTRAINT "ClipperOperationalProfile_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipperCandidate" ADD CONSTRAINT "ClipperCandidate_approvedCreatorProfileId_fkey" FOREIGN KEY ("approvedCreatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QcReview" ADD CONSTRAINT "QcReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CampaignSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "PayoutRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_payoutRunItemId_fkey" FOREIGN KEY ("payoutRunItemId") REFERENCES "PayoutRunItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayoutRunItem" ADD CONSTRAINT "PayoutRunItem_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "PayoutRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutRunItem" ADD CONSTRAINT "PayoutRunItem_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayoutRunItem" ADD CONSTRAINT "PayoutRunItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CampaignSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayoutRunItem" ADD CONSTRAINT "PayoutRunItem_productionAssignmentId_fkey" FOREIGN KEY ("productionAssignmentId") REFERENCES "ProductionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
