ALTER TABLE "CreatorTikTokConnection"
ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "CreatorTikTokConnection_refreshTokenExpiresAt_idx"
ON "CreatorTikTokConnection"("refreshTokenExpiresAt");
