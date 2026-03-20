import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  getInstagramProfile,
  getMediaInsights,
  computeEngagementRate,
} from "@/lib/instagram";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error) return NextResponse.redirect(`${appUrl}/creator/profile?error=instagram_denied`);
  if (!code || !state) return NextResponse.redirect(`${appUrl}/creator/profile?error=missing_params`);

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
    // Diagnostic: log token prefix to identify token type (IGQV = Instagram, EAA = Facebook)
    console.log("Token prefix:", accessToken?.slice(0, 6), "| expiresIn:", expiresIn);
    if (!accessToken) throw new Error(`No access token in exchange response`);
    const { ciphertext, iv } = encrypt(accessToken);
    const profile = await getInstagramProfile(accessToken);
    const insights = await getMediaInsights(profile.id, accessToken, 20);
    const engagementRate = computeEngagementRate(insights, profile.followerCount);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.socialAccount.upsert({
      where: {
        creatorProfileId_platform: {
          creatorProfileId: user.creatorProfile.id,
          platform: "instagram",
        },
      },
      update: {
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: ciphertext,
        accessTokenIv: iv,
        tokenExpiresAt,
        followerCount: profile.followerCount,
        engagementRate,
        lastSyncedAt: new Date(),
        isActive: true,
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
        lastSyncedAt: new Date(),
      },
    });

    await prisma.creatorProfile.update({
      where: { id: user.creatorProfile.id },
      data: {
        totalFollowers: profile.followerCount,
        engagementRate,
        avatarUrl: profile.profilePictureUrl || undefined,
        displayName:
          user.creatorProfile.displayName === "New Creator"
            ? profile.name || profile.username
            : user.creatorProfile.displayName,
      },
    });

    return NextResponse.redirect(`${appUrl}/creator/profile?success=instagram_connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Instagram OAuth callback error:", msg);
    // Include token prefix in detail to identify token type without exposing full token
    return NextResponse.redirect(`${appUrl}/profile?error=token_exchange_failed&detail=${encodeURIComponent(msg)}`);
  }
}
