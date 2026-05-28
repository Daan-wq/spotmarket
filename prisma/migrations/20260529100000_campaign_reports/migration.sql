CREATE TYPE "CampaignReportStatus" AS ENUM ('DRAFT', 'FINAL');

CREATE TABLE "CampaignReport" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "CampaignReportStatus" NOT NULL DEFAULT 'DRAFT',
  "brandId" TEXT,
  "campaignId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "executiveSummary" TEXT NOT NULL,
  "keyTakeaways" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "learnings" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "nextCampaignRecommendations" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "sectionSettings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CampaignReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignReport_status_updatedAt_idx" ON "CampaignReport"("status", "updatedAt");
CREATE INDEX "CampaignReport_brandId_idx" ON "CampaignReport"("brandId");
CREATE INDEX "CampaignReport_campaignId_idx" ON "CampaignReport"("campaignId");
CREATE INDEX "CampaignReport_periodStart_periodEnd_idx" ON "CampaignReport"("periodStart", "periodEnd");

ALTER TABLE "CampaignReport"
  ADD CONSTRAINT "CampaignReport_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignReport"
  ADD CONSTRAINT "CampaignReport_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
