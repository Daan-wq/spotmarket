ALTER TABLE "User"
ADD COLUMN "dismissedFacebookPageWarning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dismissedInstagramProfessionalWarning" BOOLEAN NOT NULL DEFAULT false;
