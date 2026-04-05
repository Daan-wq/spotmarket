import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";

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
      creatorProfile: {
        select: { userId: true },
      },
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

      const codeInBio = bio.includes(connection.verificationCode);

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

/**
 * Fetch Instagram bio from public profile page.
 * Instagram embeds bio text in meta tags on the public profile page.
 * Returns the bio text or null if unable to fetch.
 */
async function fetchInstagramBio(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Try to extract bio from meta description tag
    // Instagram puts bio in: <meta property="og:description" content="... bio text ..." />
    const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*?)"/i);
    if (ogMatch?.[1]) {
      return decodeHtmlEntities(ogMatch[1]);
    }

    // Fallback: try meta name="description"
    const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]*?)"/i);
    if (metaMatch?.[1]) {
      return decodeHtmlEntities(metaMatch[1]);
    }

    // Fallback: search raw HTML for the verification code pattern
    // This is a broad check but works as last resort
    return html;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}
