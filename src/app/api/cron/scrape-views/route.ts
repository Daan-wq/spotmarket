/**
 * Vercel Cron: scrape-submission-views
 *
 * Scheduled hit (configured in vercel.json) that pulls fresh view counts from
 * Apify for every recent submission. Used by the link-in-bio fallback flow
 * since we can't poll OAuth APIs while platform review is pending.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchClipMetrics } from "@/lib/clip-views";
import { isApifyConfigured } from "@/lib/apify";

const BATCH_SIZE = 25;
const STALE_DAYS = 30;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  // Vercel Cron also passes the secret via x-vercel-cron-signature; accept either.
  if (req.headers.get("x-vercel-cron-secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isApifyConfigured()) {
    return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const submissions = await prisma.campaignSubmission.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      OR: [{ settledAt: null }, { updatedAt: { gt: cutoff } }],
      sourceMethod: "BIO_VERIFY",
    },
    orderBy: [{ lastScrapedAt: { sort: "asc", nulls: "first" } }],
    take: BATCH_SIZE,
    select: { id: true, postUrl: true, creatorId: true, campaignId: true },
  });

  let scraped = 0;
  let failed = 0;
  let unavailable = 0;

  for (const s of submissions) {
    try {
      const metrics = await fetchClipMetrics(s.postUrl);
      if (!metrics) {
        failed++;
        await prisma.campaignSubmission.update({
          where: { id: s.id },
          data: {
            lastScrapedAt: new Date(),
            scrapeFailures: { increment: 1 },
          },
        });
        continue;
      }

      if (metrics.unavailable) {
        unavailable++;
        await prisma.campaignSubmission.update({
          where: { id: s.id },
          data: {
            lastScrapedAt: metrics.fetchedAt,
            status: "FLAGGED",
            scrapeFailures: { increment: 1 },
          },
        });
        await prisma.notification.create({
          data: {
            userId: s.creatorId,
            type: "SUBMISSION_REJECTED",
            data: { submissionId: s.id, reason: "post_unavailable" },
          },
        });
        continue;
      }

      scraped++;
      await prisma.campaignSubmission.update({
        where: { id: s.id },
        data: {
          viewCount: metrics.views ?? undefined,
          likeCount: metrics.likes ?? undefined,
          commentCount: metrics.comments ?? undefined,
          shareCount: metrics.shares ?? undefined,
          lastScrapedAt: metrics.fetchedAt,
          scrapeFailures: 0,
        },
      });
    } catch (err) {
      failed++;
      console.error(`[scrape-views] error for ${s.id}:`, err);
      await prisma.campaignSubmission.update({
        where: { id: s.id },
        data: { lastScrapedAt: new Date(), scrapeFailures: { increment: 1 } },
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({
    processed: submissions.length,
    scraped,
    failed,
    unavailable,
  });
}
