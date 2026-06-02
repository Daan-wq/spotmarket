ALTER TABLE "Brand"
ADD COLUMN "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "portalCreatedAt" TIMESTAMP(3),
ADD COLUMN "portalCreatedBy" TEXT;

CREATE INDEX "Brand_portalEnabled_idx" ON "Brand"("portalEnabled");
