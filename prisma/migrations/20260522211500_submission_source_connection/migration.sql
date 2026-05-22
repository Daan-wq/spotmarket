-- Persist the OAuth connection that produced a campaign submission so metrics
-- polling does not have to infer an account from handle-less platform URLs.

ALTER TABLE "CampaignSubmission"
ADD COLUMN "sourceConnectionType" "ConnectionType",
ADD COLUMN "sourceConnectionId" TEXT;

CREATE INDEX "CampaignSubmission_sourceConnectionType_sourceConnectionId_idx"
ON "CampaignSubmission"("sourceConnectionType", "sourceConnectionId");
