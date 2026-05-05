-- Final remediation modules: pricing templates, contracts/documents, and weekly business snapshots.

CREATE TABLE "PricingPackageTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "platforms" "Platform"[] NOT NULL DEFAULT ARRAY[]::"Platform"[],
  "includedClips" INTEGER,
  "includedViews" INTEGER,
  "creatorRatePerClip" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "creatorCpv" DECIMAL(8,6) NOT NULL DEFAULT 0,
  "businessCpv" DECIMAL(8,6) NOT NULL DEFAULT 0,
  "marginPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingPackageTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BrandOnboarding" ADD COLUMN "pricingTemplateId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "pricingTemplateId" TEXT;

CREATE TABLE "ContractDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CONTRACT',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "owner" TEXT,
  "brandId" TEXT,
  "campaignId" TEXT,
  "effectiveAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "renewalAt" TIMESTAMP(3),
  "externalUrl" TEXT,
  "storageKey" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyBusinessSnapshot" (
  "id" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "weekEnd" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "revenueBooked" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "expectedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "creatorCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "payoutOwed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estimatedProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "activeBrands" INTEGER NOT NULL DEFAULT 0,
  "activeClippers" INTEGER NOT NULL DEFAULT 0,
  "clipsDelivered" INTEGER NOT NULL DEFAULT 0,
  "clipsApproved" INTEGER NOT NULL DEFAULT 0,
  "clipsRejectedOrRevised" INTEGER NOT NULL DEFAULT 0,
  "openRisks" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklyBusinessSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PricingPackageTemplate_isActive_sortOrder_idx" ON "PricingPackageTemplate"("isActive", "sortOrder");
CREATE INDEX "BrandOnboarding_pricingTemplateId_idx" ON "BrandOnboarding"("pricingTemplateId");
CREATE INDEX "Campaign_pricingTemplateId_idx" ON "Campaign"("pricingTemplateId");

CREATE INDEX "ContractDocument_status_idx" ON "ContractDocument"("status");
CREATE INDEX "ContractDocument_owner_idx" ON "ContractDocument"("owner");
CREATE INDEX "ContractDocument_brandId_idx" ON "ContractDocument"("brandId");
CREATE INDEX "ContractDocument_campaignId_idx" ON "ContractDocument"("campaignId");
CREATE INDEX "ContractDocument_expiresAt_idx" ON "ContractDocument"("expiresAt");
CREATE INDEX "ContractDocument_renewalAt_idx" ON "ContractDocument"("renewalAt");

CREATE UNIQUE INDEX "WeeklyBusinessSnapshot_weekStart_weekEnd_key" ON "WeeklyBusinessSnapshot"("weekStart", "weekEnd");
CREATE INDEX "WeeklyBusinessSnapshot_status_idx" ON "WeeklyBusinessSnapshot"("status");
CREATE INDEX "WeeklyBusinessSnapshot_weekStart_idx" ON "WeeklyBusinessSnapshot"("weekStart");

ALTER TABLE "BrandOnboarding" ADD CONSTRAINT "BrandOnboarding_pricingTemplateId_fkey" FOREIGN KEY ("pricingTemplateId") REFERENCES "PricingPackageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_pricingTemplateId_fkey" FOREIGN KEY ("pricingTemplateId") REFERENCES "PricingPackageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
