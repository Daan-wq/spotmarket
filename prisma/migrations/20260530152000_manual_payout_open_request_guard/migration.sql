-- Prevent one creator from opening multiple manual payout requests at once.
-- Existing payout-run rows are excluded; this guard only applies to creator
-- withdrawal requests created through /api/wallet/withdraw.
CREATE UNIQUE INDEX "Payout_one_open_manual_request_per_creator"
  ON "Payout"("creatorProfileId")
  WHERE "creatorProfileId" IS NOT NULL
    AND "requestedAt" IS NOT NULL
    AND "payoutRunId" IS NULL
    AND "payoutRunItemId" IS NULL
    AND "status" IN ('pending'::"PayoutStatus", 'processing'::"PayoutStatus");
