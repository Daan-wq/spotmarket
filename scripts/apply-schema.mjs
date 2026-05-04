import pg from "pg";

const { Client } = pg;

const statements = [
  `CREATE SCHEMA IF NOT EXISTS "public"`,
  `CREATE TYPE "UserRole" AS ENUM ('admin', 'business', 'creator')`,
  `CREATE TYPE "SocialPlatform" AS ENUM ('instagram', 'tiktok')`,
  `CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled')`,
  `CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed', 'disputed')`,
  `CREATE TYPE "PayoutType" AS ENUM ('upfront', 'final')`,
  `CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'sent', 'confirmed', 'failed', 'disputed')`,
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "walletAddress" TEXT,
    "primaryGeo" TEXT NOT NULL DEFAULT 'US',
    "totalFollowers" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "BusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "SocialAccount" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformUsername" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "audienceGeo" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentGuidelines" TEXT,
    "referralLink" TEXT NOT NULL,
    "targetGeo" TEXT[],
    "minFollowers" INTEGER NOT NULL,
    "minEngagementRate" DECIMAL(5,2) NOT NULL,
    "totalBudget" DECIMAL(12,2) NOT NULL,
    "creatorCpv" DECIMAL(8,6) NOT NULL,
    "adminMargin" DECIMAL(8,6) NOT NULL,
    "businessCpv" DECIMAL(8,6) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "briefAssetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CampaignApplication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "followerSnapshot" INTEGER,
    "engagementSnapshot" DECIMAL(5,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CampaignPost" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "platformPostId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isFraudSuspect" BOOLEAN NOT NULL DEFAULT false,
    "fraudFlags" JSONB,
    CONSTRAINT "CampaignPost_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "ViewSnapshot" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewsCount" INTEGER NOT NULL,
    "likesCount" INTEGER NOT NULL,
    "commentsCount" INTEGER NOT NULL,
    "reach" INTEGER,
    "impressions" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ViewSnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Payout" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "amount" DECIMAL(12,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "walletAddress" TEXT NOT NULL,
    "type" "PayoutType" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "coinbaseChargeId" TEXT,
    "verifiedViews" INTEGER,
    "initiatedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CampaignReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "totalViews" BIGINT NOT NULL,
    "totalPayout" DECIMAL(12,2) NOT NULL,
    "adminRevenue" DECIMAL(12,2) NOT NULL,
    "creatorCount" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataJson" JSONB NOT NULL,
    CONSTRAINT "CampaignReport_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseId_key" ON "User"("supabaseId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE INDEX IF NOT EXISTS "User_supabaseId_idx" ON "User"("supabaseId")`,
  `CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_userId_key" ON "CreatorProfile"("userId")`,
  `CREATE INDEX IF NOT EXISTS "CreatorProfile_primaryGeo_idx" ON "CreatorProfile"("primaryGeo")`,
  `CREATE INDEX IF NOT EXISTS "CreatorProfile_engagementRate_idx" ON "CreatorProfile"("engagementRate")`,
  `CREATE INDEX IF NOT EXISTS "CreatorProfile_totalFollowers_idx" ON "CreatorProfile"("totalFollowers")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProfile_userId_key" ON "BusinessProfile"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SocialAccount_creatorProfileId_platform_key" ON "SocialAccount"("creatorProfileId", "platform")`,
  `CREATE INDEX IF NOT EXISTS "SocialAccount_platform_idx" ON "SocialAccount"("platform")`,
  `CREATE INDEX IF NOT EXISTS "SocialAccount_tokenExpiresAt_idx" ON "SocialAccount"("tokenExpiresAt")`,
  `CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status")`,
  `CREATE INDEX IF NOT EXISTS "Campaign_deadline_idx" ON "Campaign"("deadline")`,
  `CREATE INDEX IF NOT EXISTS "Campaign_businessProfileId_idx" ON "Campaign"("businessProfileId")`,
  `CREATE INDEX IF NOT EXISTS "Campaign_targetGeo_idx" ON "Campaign" USING GIN ("targetGeo")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CampaignApplication_campaignId_creatorProfileId_key" ON "CampaignApplication"("campaignId", "creatorProfileId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignApplication_status_idx" ON "CampaignApplication"("status")`,
  `CREATE INDEX IF NOT EXISTS "CampaignApplication_campaignId_idx" ON "CampaignApplication"("campaignId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignApplication_creatorProfileId_idx" ON "CampaignApplication"("creatorProfileId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignPost_applicationId_idx" ON "CampaignPost"("applicationId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignPost_platformPostId_idx" ON "CampaignPost"("platformPostId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignPost_platform_idx" ON "CampaignPost"("platform")`,
  `CREATE INDEX IF NOT EXISTS "ViewSnapshot_postId_capturedAt_idx" ON "ViewSnapshot"("postId", "capturedAt")`,
  `CREATE INDEX IF NOT EXISTS "ViewSnapshot_capturedAt_idx" ON "ViewSnapshot"("capturedAt")`,
  `CREATE INDEX IF NOT EXISTS "Message_campaignId_createdAt_idx" ON "Message"("campaignId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId")`,
  `CREATE INDEX IF NOT EXISTS "Message_recipientId_idx" ON "Message"("recipientId")`,
  `CREATE INDEX IF NOT EXISTS "Payout_applicationId_idx" ON "Payout"("applicationId")`,
  `CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status")`,
  `CREATE INDEX IF NOT EXISTS "Payout_creatorProfileId_idx" ON "Payout"("creatorProfileId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CampaignReport_campaignId_key" ON "CampaignReport"("campaignId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignReport_generatedAt_idx" ON "CampaignReport"("generatedAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId")`,
  `ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CampaignApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "CampaignPost" ADD CONSTRAINT "CampaignPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "ViewSnapshot" ADD CONSTRAINT "ViewSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CampaignPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "Message" ADD CONSTRAINT "Message_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "Payout" ADD CONSTRAINT "Payout_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CampaignApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "CampaignReport" ADD CONSTRAINT "CampaignReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
];

const client = new Client({
  connectionString: "postgresql://postgres.qdcgmsaaxjylnhrrbvvx:5rEaeV89oFaw9AhJ@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Connecting to Supabase...");
  await client.connect();
  console.log("Connected. Applying schema...\n");

  let ok = 0;
  let skipped = 0;

  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].substring(0, 60);
    try {
      await client.query(stmt);
      console.log(`✓ ${label}`);
      ok++;
    } catch (err) {
      if (err.code === "42P07" || err.code === "42710" || err.message.includes("already exists")) {
        console.log(`- ${label} (already exists, skipped)`);
        skipped++;
      } else {
        console.error(`✗ ${label}`);
        console.error(`  Error: ${err.message}`);
      }
    }
  }

  console.log(`\nDone: ${ok} applied, ${skipped} skipped.`);
  await client.end();
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
