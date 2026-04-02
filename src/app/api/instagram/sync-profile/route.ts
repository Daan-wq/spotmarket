import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchInstagramProfile,
  fetchFollowerDemographics,
  fetchRecentMedia,
  computeEngagementRate,
  computeDemographicStats,
} from "@/lib/instagram";
import type { IgDemographics } from "@/types/instagram";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { creatorId } = body as { creatorId?: string };
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isOwner = user.creatorProfile?.id === creatorId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const account = await prisma.socialAccount.findFirst({
    where: { creatorProfileId: creatorId, platform: "instagram", isActive: true },
  });
  if (!account) return NextResponse.json({ error: "No active Instagram account" }, { status: 404 });

  const accessToken = decrypt(account.accessToken, account.accessTokenIv);
  const igUserId = account.platformUserId;

  try {
    const profile = await fetchInstagramProfile(accessToken, igUserId);
    const media = await fetchRecentMedia(accessToken, igUserId);
    const engagementRate = computeEngagementRate(
      media.map((m) => ({
        mediaId: m.id,
        likeCount: m.like_count,
        commentCount: m.comments_count,
        impressions: 0,
        reach: 0,
        videoViews: 0,
      })),
      profile.followersCount
    );

    let demographics: IgDemographics | null = null;
    if (profile.followersCount >= 100) {
      try {
        demographics = await fetchFollowerDemographics(accessToken, igUserId);
      } catch (err) {
        console.warn("Demographics fetch failed (non-fatal):", err);
      }
    }

    const now = new Date();

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

    return NextResponse.json({ success: true, syncedAt: now.toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync-profile]", msg);
    // Instagram OAuthException code 190 = expired / revoked token
    if (msg.includes('"code":190') || msg.includes("code 190")) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
