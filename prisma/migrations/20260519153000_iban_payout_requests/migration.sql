ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';

ALTER TABLE "CreatorProfile"
  ADD COLUMN "payoutIban" TEXT,
  ADD COLUMN "payoutAccountName" TEXT;

ALTER TABLE "Payout"
  ADD COLUMN "bankIbanSnapshot" TEXT,
  ADD COLUMN "bankAccountNameSnapshot" TEXT,
  ADD COLUMN "bankReference" TEXT,
  ADD COLUMN "requestedAt" TIMESTAMP(3);

CREATE INDEX "Payout_paymentMethod_status_requestedAt_idx" ON "Payout"("paymentMethod", "status", "requestedAt");
