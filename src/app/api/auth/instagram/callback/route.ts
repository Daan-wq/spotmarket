import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  getInstagramProfile,
  getMediaInsights,
  computeEngagementRate,
} from "@/lib/instagram";
import { updateCreatorAggregateStats } from "@/lib/creator-stats";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/sign-in?error=ig_denied`);
  }

  // ─────────────────────────────────────────
  // NETWORK MEMBER JOIN FLOW
  // ─────────────────────────────────────────
  if (state.startsWith("join:")) {
    const inviteCode = state.replace("join:", "");
    const network = await prisma.networkProfile.findUnique({
      where: { inviteCode },
    });

    if (!network) {
      return NextResponse.redirect(`${appUrl}/`);
    }

    try {
      const { accessToken, expiresIn } = await exchangeCodeForToken(code);
      if (!accessToken) throw new Error("No access token in exchange response");

      const { ciphertext, iv } = encrypt(accessToken);
      const profile = await getInstagramProfile(accessToken);

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      // Retrieve name and email from sessionStorage (passed from join page)
      // In production, pass these via state or session
      const displayName = state.includes("displayName")
        ? decodeURIComponent(state.split("displayName:")[1]?.split("|")[0] ?? "")
        : undefined;

      await prisma.networkMember.upsert({
        where: { igUserId: profile.id },
        create: {
          networkId: network.id,
          igUserId: profile.id,
          igUsername: profile.username,
          igAccessToken: ciphertext,
          igAccessTokenIv: iv,
          igTokenExpiry: tokenExpiresAt,
          igFollowerCount: profile.followerCount ?? 0,
          igIsConnected: true,
          displayName: displayName || undefined,
        },
        update: {
          networkId: network.id,
          igUsername: profile.username,
          igAccessToken: ciphertext,
          igAccessTokenIv: iv,
          igTokenExpiry: tokenExpiresAt,
          igFollowerCount: profile.followerCount ?? 0,
          igIsConnected: true,
          displayName: displayName || undefined,
        },
      });

      return NextResponse.redirect(`${appUrl}/join/${inviteCode}/success`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Network member Instagram OAuth callback error:", msg);
      return NextResponse.redirect(`${appUrl}/sign-in?error=token_exchange_failed`);
    }
  }

  // ─────────────────────────────────────────
  // REGULAR CREATOR OAUTH FLOW
  // ─────────────────────────────────────────
  let supabaseId: string;
  try {
    supabaseId = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return NextResponse.redirect(`${appUrl}/creator/profile?error=invalid_state`);
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { creatorProfile: true },
  });

  if (!user?.creatorProfile) {
    return NextResponse.redirect(`${appUrl}/creator/profile?error=user_not_found`);
  }

  try {
    const { accessToken, expiresIn } = await exchangeCodeForToken(code);
    if (!accessToken) throw new Error(`No access token in exchange response`);

    const { ciphertext, iv } = encrypt(accessToken);
    const profile = await getInstagramProfile(accessToken);
    const insights = await getMediaInsights(profile.id, accessToken, 20);
    const engagementRate = computeEngagementRate(insights, profile.followerCount);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.socialAccount.upsert({
      where: { platformUserId: profile.id },
      update: {
        accessToken: ciphertext,
        accessTokenIv: iv,
        tokenExpiresAt,
        followerCount: profile.followerCount,
        engagementRate,
        platformUsername: profile.username,
        igName: profile.name ?? null,
        igProfilePicUrl: profile.profilePictureUrl ?? null,
        isActive: true,
        lastSyncedAt: new Date(),
      },
      create: {
        creatorProfileId: user.creatorProfile.id,
        platform: "instagram",
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: ciphertext,
        accessTokenIv: iv,
        tokenExpiresAt,
        followerCount: profile.followerCount,
        engagementRate,
        igName: profile.name ?? null,
        igProfilePicUrl: profile.profilePictureUrl ?? null,
        isActive: true,
        lastSyncedAt: new Date(),
      },
    });

    await updateCreatorAggregateStats(user.creatorProfile.id);

    // Update displayName if still set to default
    if (user.creatorProfile.displayName === "New Creator") {
      await prisma.creatorProfile.update({
        where: { id: user.creatorProfile.id },
        data: {
          displayName: profile.name || profile.username,
          avatarUrl: profile.profilePictureUrl || undefined,
        },
      });
    }

    return NextResponse.redirect(`${appUrl}/pages?success=instagram_connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Instagram OAuth callback error:", msg);
    return NextResponse.redirect(`${appUrl}/profile?error=token_exchange_failed&detail=${encodeURIComponent(msg)}`);
  }
}
