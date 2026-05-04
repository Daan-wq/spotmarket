import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";
import { fetchInstagramBio } from "@/lib/instagram-bio";

const ONE_HOUR_AGO = 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cron job: Check Instagram bios for verification codes.
 * Fetches public IG profiles and checks if the verification code is in the bio.
 * Schedule: every 6 hours via Vercel Cron or external trigger.
 */
export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - ONE_HOUR_AGO);
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS);

  // Find all unverified connections that haven't been checked recently
  const connections = await prisma.creatorIgConnection.findMany({
    where: {
      isVerified: false,
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: oneHourAgo } },
      ],
    },
    include: {
      creatorProfile: { select: { userId: true } },
      bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 20, // Process in batches to avoid timeout
  });

  const results = {
    checked: 0,
    verified: 0,
    failed: 0,
    errors: 0,
  };

  for (const connection of connections) {
    try {
      results.checked++;

      // Fetch public Instagram profile
      const bio = await fetchInstagramBio(connection.igUsername);

      if (bio === null) {
        // Could not fetch profile
        results.errors++;
        await prisma.creatorIgConnection.update({
          where: { id: connection.id },
          data: { lastCheckedAt: now },
        });
        continue;
      }

      const latestBioCode = connection.bioVerifications[0]?.code;
      const codeToCheck = latestBioCode ?? connection.verificationCode;
      const codeInBio = bio.includes(codeToCheck);

      if (codeInBio) {
        // Verified!
        await prisma.creatorIgConnection.update({
          where: { id: connection.id },
          data: {
            isVerified: true,
            verifiedAt: now,
            lastCheckedAt: now,
          },
        });

        // Update bio verification record
        await prisma.bioVerification.updateMany({
          where: { connectionId: connection.id, status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: now, lastCheckedAt: now },
        });

        // Mark creator profile as verified
        await prisma.creatorProfile.update({
          where: { id: connection.creatorProfileId },
          data: { isVerified: true },
        });

        // Notify creator
        const user = await prisma.user.findFirst({
          where: { creatorProfile: { id: connection.creatorProfileId } },
        });
        if (user) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "BIO_VERIFIED",
              data: { igUsername: connection.igUsername },
            },
          });
        }

        results.verified++;
      } else if (connection.createdAt < sevenDaysAgo) {
        // Failed after 7 days
        await prisma.creatorIgConnection.update({
          where: { id: connection.id },
          data: { lastCheckedAt: now },
        });

        await prisma.bioVerification.updateMany({
          where: { connectionId: connection.id, status: "PENDING" },
          data: { status: "FAILED", lastCheckedAt: now },
        });

        results.failed++;
      } else {
        // Not yet, update lastCheckedAt
        await prisma.creatorIgConnection.update({
          where: { id: connection.id },
          data: { lastCheckedAt: now },
        });
      }
    } catch (err) {
      console.error(`[check-bio] Error checking @${connection.igUsername}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
  });
}

