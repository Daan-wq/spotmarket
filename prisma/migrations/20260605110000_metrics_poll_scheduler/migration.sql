ALTER TABLE "CampaignSubmission"
  ADD COLUMN "lastMetricsPollAttemptAt" TIMESTAMP(3),
  ADD COLUMN "nextMetricsPollAt" TIMESTAMP(3),
  ADD COLUMN "metricsPollLockedAt" TIMESTAMP(3);

CREATE INDEX "CampaignSubmission_nextMetricsPollAt_idx"
  ON "CampaignSubmission"("nextMetricsPollAt");

CREATE INDEX "CampaignSubmission_metricsPollLockedAt_idx"
  ON "CampaignSubmission"("metricsPollLockedAt");

UPDATE "CampaignSubmission"
SET "nextMetricsPollAt" = now()
WHERE "status" IN ('PENDING', 'APPROVED', 'FLAGGED')
  AND "nextMetricsPollAt" IS NULL;
