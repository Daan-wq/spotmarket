CREATE TYPE "BanSignalType" AS ENUM (
  'IP',
  'DEVICE',
  'DISCORD',
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE',
  'FACEBOOK',
  'PAYOUT'
);

CREATE TYPE "BanIndicatorStrength" AS ENUM ('WEAK', 'STRONG');
CREATE TYPE "BanIndicatorMode" AS ENUM ('LAYERED', 'HARD');
CREATE TYPE "EnforcementDecision" AS ENUM ('ALLOW', 'CHALLENGE', 'BLOCK');

CREATE TABLE "AccountBan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "internalNote" TEXT,
  "bannedByUserId" TEXT NOT NULL,
  "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "liftedAt" TIMESTAMP(3),
  "liftedByUserId" TEXT,
  "liftReason" TEXT,
  CONSTRAINT "AccountBan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessSignal" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "supabaseId" TEXT NOT NULL,
  "type" "BanSignalType" NOT NULL,
  "valueHash" TEXT NOT NULL,
  "maskedValue" TEXT NOT NULL,
  "metadata" JSONB,
  "signupObservedAt" TIMESTAMP(3),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BanIndicator" (
  "id" TEXT NOT NULL,
  "accountBanId" TEXT NOT NULL,
  "type" "BanSignalType" NOT NULL,
  "valueHash" TEXT NOT NULL,
  "maskedValue" TEXT NOT NULL,
  "strength" "BanIndicatorStrength" NOT NULL,
  "mode" "BanIndicatorMode" NOT NULL DEFAULT 'LAYERED',
  "reason" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),
  CONSTRAINT "BanIndicator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnforcementEvent" (
  "id" TEXT NOT NULL,
  "accountBanId" TEXT,
  "subjectHash" TEXT,
  "decision" "EnforcementDecision" NOT NULL,
  "observedDecision" "EnforcementDecision" NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "matchedIndicatorIds" TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnforcementEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessSignal_supabaseId_type_valueHash_key"
  ON "AccessSignal"("supabaseId", "type", "valueHash");
CREATE INDEX "AccountBan_userId_liftedAt_idx" ON "AccountBan"("userId", "liftedAt");
CREATE INDEX "AccountBan_bannedAt_idx" ON "AccountBan"("bannedAt");
CREATE UNIQUE INDEX "AccountBan_one_active_per_user_key"
  ON "AccountBan"("userId") WHERE "liftedAt" IS NULL;
CREATE INDEX "AccessSignal_userId_lastSeenAt_idx" ON "AccessSignal"("userId", "lastSeenAt");
CREATE INDEX "AccessSignal_type_valueHash_expiresAt_idx" ON "AccessSignal"("type", "valueHash", "expiresAt");
CREATE INDEX "AccessSignal_type_valueHash_signupObservedAt_idx" ON "AccessSignal"("type", "valueHash", "signupObservedAt");
CREATE INDEX "AccessSignal_expiresAt_idx" ON "AccessSignal"("expiresAt");
CREATE INDEX "BanIndicator_type_valueHash_deactivatedAt_idx" ON "BanIndicator"("type", "valueHash", "deactivatedAt");
CREATE INDEX "BanIndicator_accountBanId_deactivatedAt_idx" ON "BanIndicator"("accountBanId", "deactivatedAt");
CREATE UNIQUE INDEX "BanIndicator_one_active_value_per_ban_key"
  ON "BanIndicator"("accountBanId", "type", "valueHash")
  WHERE "deactivatedAt" IS NULL;
CREATE INDEX "EnforcementEvent_accountBanId_createdAt_idx" ON "EnforcementEvent"("accountBanId", "createdAt");
CREATE INDEX "EnforcementEvent_decision_createdAt_idx" ON "EnforcementEvent"("decision", "createdAt");
CREATE INDEX "EnforcementEvent_createdAt_idx" ON "EnforcementEvent"("createdAt");

ALTER TABLE "AccountBan"
  ADD CONSTRAINT "AccountBan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountBan"
  ADD CONSTRAINT "AccountBan_bannedByUserId_fkey"
  FOREIGN KEY ("bannedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountBan"
  ADD CONSTRAINT "AccountBan_liftedByUserId_fkey"
  FOREIGN KEY ("liftedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessSignal"
  ADD CONSTRAINT "AccessSignal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BanIndicator"
  ADD CONSTRAINT "BanIndicator_accountBanId_fkey"
  FOREIGN KEY ("accountBanId") REFERENCES "AccountBan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BanIndicator"
  ADD CONSTRAINT "BanIndicator_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnforcementEvent"
  ADD CONSTRAINT "EnforcementEvent_accountBanId_fkey"
  FOREIGN KEY ("accountBanId") REFERENCES "AccountBan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
