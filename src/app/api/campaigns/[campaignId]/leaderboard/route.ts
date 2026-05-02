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
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "50"))
  );

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, creatorCpv: true },
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
      earnedAmount: true,
      createdAt: true,
      creatorId: true,
      creator: {
        select: {
          id: true,
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
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

  // Aggregate per creator.
  const byCreator = new Map<
    string,
    {
      creatorId: string;
      creatorProfileId: string | null;
      displayName: string;
      avatarUrl: string | null;
      submissionCount: number;
      totalViews: number;
      totalEarned: number;
      bestPostUrl: string | null;
      bestPostViews: number;
      score: number | null;
    }
  >();

  for (const s of submissions) {
    const profile = s.creator.creatorProfile;
    const key = s.creatorId;
    const views =
      s.eligibleViews ?? s.viewCount ?? s.claimedViews ?? 0;
    const earned = Number(s.earnedAmount ?? 0);

    const existing = byCreator.get(key);
    if (!existing) {
      byCreator.set(key, {
        creatorId: s.creatorId,
        creatorProfileId: profile?.id ?? null,
        displayName: profile?.displayName ?? "Anonymous clipper",
        avatarUrl: profile?.avatarUrl ?? null,
        submissionCount: 1,
        totalViews: views,
        totalEarned: earned,
        bestPostUrl: s.postUrl,
        bestPostViews: views,
        score: profile?.id
          ? scoreByProfile.get(profile.id)?.score ?? null
          : null,
      });
    } else {
      existing.submissionCount += 1;
      existing.totalViews += views;
      existing.totalEarned += earned;
      if (views > existing.bestPostViews) {
        existing.bestPostViews = views;
        existing.bestPostUrl = s.postUrl;
      }
    }
  }

  const rows = Array.from(byCreator.values());

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
