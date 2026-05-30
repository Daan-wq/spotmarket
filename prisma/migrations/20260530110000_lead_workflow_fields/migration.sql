ALTER TABLE "BrandLead"
ADD COLUMN "conversionBlocker" TEXT,
ADD COLUMN "nextAction" TEXT,
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "BrandLead_archivedAt_idx" ON "BrandLead"("archivedAt");
CREATE INDEX "BrandLead_conversionBlocker_idx" ON "BrandLead"("conversionBlocker");
