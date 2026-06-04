-- CreateTable
CREATE TABLE "CreatorBalanceAdjustment" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorBalanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorBalanceAdjustment_reference_key" ON "CreatorBalanceAdjustment"("reference");

-- CreateIndex
CREATE INDEX "CreatorBalanceAdjustment_creatorProfileId_createdAt_idx" ON "CreatorBalanceAdjustment"("creatorProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreatorBalanceAdjustment" ADD CONSTRAINT "CreatorBalanceAdjustment_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
