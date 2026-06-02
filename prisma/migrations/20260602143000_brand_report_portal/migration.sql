ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'brand';

CREATE TYPE "BrandContactStatus" AS ENUM ('INVITED', 'ACTIVE', 'REVOKED');

CREATE TABLE "BrandContact" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "status" "BrandContactStatus" NOT NULL DEFAULT 'INVITED',
  "inviteTokenHash" TEXT,
  "inviteExpiresAt" TIMESTAMP(3),
  "invitedBy" TEXT,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrandContact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CampaignReport"
  ADD COLUMN "visibleToBrand" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "brandVisibleAt" TIMESTAMP(3),
  ADD COLUMN "brandVisibleBy" TEXT;

CREATE UNIQUE INDEX "BrandContact_inviteTokenHash_key" ON "BrandContact"("inviteTokenHash");
CREATE UNIQUE INDEX "BrandContact_brandId_email_key" ON "BrandContact"("brandId", "email");
CREATE INDEX "BrandContact_brandId_status_idx" ON "BrandContact"("brandId", "status");
CREATE INDEX "BrandContact_email_idx" ON "BrandContact"("email");
CREATE INDEX "BrandContact_userId_idx" ON "BrandContact"("userId");
CREATE INDEX "CampaignReport_brandId_status_visibleToBrand_updatedAt_idx" ON "CampaignReport"("brandId", "status", "visibleToBrand", "updatedAt");

ALTER TABLE "BrandContact"
  ADD CONSTRAINT "BrandContact_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrandContact"
  ADD CONSTRAINT "BrandContact_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
