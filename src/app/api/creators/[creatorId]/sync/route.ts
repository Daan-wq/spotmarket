import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  fetchInstagramProfile,
  fetchRecentMedia,
  fetchFollowerDemographics,
  computeEngagementRate,
  computeDemographicStats,
} from "@/lib/instagram";
import { updateCreatorAggregateStats } from "@/lib/creator-stats";
import type { IgDemographics } from "@/types/instagram";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isOwner = user.creatorProfile?.id === creatorId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accounts = await prisma.socialAccount.findMany({ where: { creatorProfileId: creatorId, isActive: true } });
  const results: Record<string, string> = {};

  for (const account of accounts) {
    try {
      if (account.platform === "instagram") {
        const accessToken = decrypt(account.accessToken, account.accessTokenIv);
        const igUserId = account.platformUserId;
        const now = new Date();

        const profile = await fetchInstagramProfile(accessToken, igUserId);
        const media = await fetchRecentMedia(accessToken, igUserId);
        const engagementRate = computeEngagementRate(
          media.map((m) => ({ mediaId: m.id, likeCount: m.like_count, commentCount: m.comments_count, impressions: 0, reach: 0, videoViews: 0 })),
          profile.followersCount
        );

        let demographics: IgDemographics | null = null;
        if (profile.followersCount >= 100) {
          try { demographics = await fetchFollowerDemographics(accessToken, igUserId); } catch { /* non-fatal */ }
        }

        await prisma.socialAccount.update({
          where: { id: account.id },
          data: {
            igName: profile.name,
            igBio: profile.biography,
            igProfilePicUrl: profile.profilePictureUrl,
            igFollowsCount: profile.followsCount,
            igWebsite: profile.website,
            followerCount: profile.followersCount,
            engagementRate,
            igMediaCache: media.length > 0 ? JSON.parse(JSON.stringify(media)) : undefined,
            ...(demographics && {
              igDemographics: JSON.parse(JSON.stringify(demographics)),
              igDemographicsUpdatedAt: now,
            }),
            lastSyncedAt: now,
          },
        });

        const computed = computeDemographicStats(demographics);
        await prisma.creatorProfile.update({
          where: { id: creatorId },
          data: {
            totalFollowers: profile.followersCount,
            engagementRate,
            avatarUrl: profile.profilePictureUrl || undefined,
            bestEngagementRate: engagementRate,
            ...(computed.topCountry && { topCountry: computed.topCountry }),
            ...(computed.topCountryPercent !== null && { topCountryPercent: computed.topCountryPercent }),
            ...(computed.malePercent !== null && { malePercent: computed.malePercent }),
            ...(computed.age18PlusPercent !== null && { age18PlusPercent: computed.age18PlusPercent }),
          },
        });

        results[`${account.platform}:${account.platformUsername}`] = "synced";
      }
    } catch (err) {
      results[`${account.platform}:${account.platformUsername}`] = `error: ${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  await updateCreatorAggregateStats(creatorId);

  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
