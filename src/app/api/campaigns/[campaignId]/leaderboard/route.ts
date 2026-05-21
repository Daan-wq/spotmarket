/**
 * GET /api/campaigns/[campaignId]/leaderboard
 *
 * Campaign-scoped leaderboard for the creator-facing surfaces (Subsystem C).
 * Lists every approved clipper on the campaign with views, earnings, post URL,
 * and the latest performance score (read directly from `ClipperPerformanceScore`).
 *
 * Peer post URLs are intentionally visible — the whole point is to let other
 * clippers see what's working and copy the winners.
 *
 * Sortable by `views` (default), `earnings`, or `score`.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCampaignLeaderboardRows } from "@/lib/campaign-leaderboard";

export const dynamic = "force-dynamic";

type Sort = "views" | "earnings" | "score";

function parseSort(value: string | null): Sort {
  if (value === "earnings" || value === "score") return value;
  return "views";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    await requireAuth("creator");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await params;
  const sort = parseSort(req.nextUrl.searchParams.get("sort"));
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(5, Math.max(1, Math.trunc(requestedLimit)))
    : 5;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      creatorCpv: true,
      minimumPaidViews: true,
      maximumPaidViews: true,
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Pull every APPROVED submission on this campaign, with its creator profile.
  // We aggregate per creator below — one creator can have multiple clips.
  const submissions = await prisma.campaignSubmission.findMany({
    where: { campaignId, status: "APPROVED" },
    select: {
      id: true,
      postUrl: true,
      viewCount: true,
      claimedViews: true,
      eligibleViews: true,
      baselineViews: true,
      earnedAmount: true,
      createdAt: true,
      creatorId: true,
      metricSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { viewCount: true, capturedAt: true },
      },
      creator: {
        select: {
          id: true,
          email: true,
          discordUsername: true,
          creatorProfile: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  // Latest score per creator profile (single batched query).
  const creatorProfileIds = Array.from(
    new Set(
      submissions
        .map((s) => s.creator.creatorProfile?.id)
        .filter((v): v is string => Boolean(v))
    )
  );

  const scores = creatorProfileIds.length
    ? await prisma.$queryRaw<
        Array<{ creatorProfileId: string; score: number; computedAt: Date }>
      >`
        SELECT DISTINCT ON ("creatorProfileId")
          "creatorProfileId", "score", "computedAt"
        FROM "ClipperPerformanceScore"
        WHERE "creatorProfileId" = ANY(${creatorProfileIds})
        ORDER BY "creatorProfileId", "computedAt" DESC
      `
    : [];
  const scoreByProfile = new Map(scores.map((r) => [r.creatorProfileId, r]));

  const rows = buildCampaignLeaderboardRows(
    submissions.map((submission) => ({ ...submission, campaign })),
  ).map((row) => ({
    ...row,
    score: row.creatorProfileId
      ? scoreByProfile.get(row.creatorProfileId)?.score ?? null
      : null,
  }));

  rows.sort((a, b) => {
    if (sort === "earnings") return b.totalEarned - a.totalEarned;
    if (sort === "score") {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      if (sb !== sa) return sb - sa;
      return b.totalViews - a.totalViews; // tiebreak
    }
    return b.totalViews - a.totalViews;
  });

  const ranked = rows.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    ...r,
  }));

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      creatorCpv: Number(campaign.creatorCpv),
    },
    sort,
    leaderboard: ranked,
    totalClippers: rows.length,
  });
}
