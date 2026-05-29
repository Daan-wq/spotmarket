-- CreateTable
CREATE TABLE "LeadGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BrandLead"
ADD COLUMN "leadGroupId" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "subcategory" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "contactLinkedIn" TEXT,
ADD COLUMN "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LeadGroup_name_key" ON "LeadGroup"("name");

-- CreateIndex
CREATE INDEX "LeadGroup_owner_idx" ON "LeadGroup"("owner");

-- CreateIndex
CREATE INDEX "BrandLead_leadGroupId_idx" ON "BrandLead"("leadGroupId");

-- CreateIndex
CREATE INDEX "BrandLead_category_idx" ON "BrandLead"("category");

-- CreateIndex
CREATE INDEX "BrandLead_subcategory_idx" ON "BrandLead"("subcategory");

-- AddForeignKey
ALTER TABLE "BrandLead" ADD CONSTRAINT "BrandLead_leadGroupId_fkey" FOREIGN KEY ("leadGroupId") REFERENCES "LeadGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
