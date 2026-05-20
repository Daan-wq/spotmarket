ALTER TABLE "CreatorProfile"
  ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "CreatorProfile_username_key" ON "CreatorProfile"("username");
