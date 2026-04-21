import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, fetchChannelProfile, REQUIRED_YT_SCOPES } from "@/lib/youtube";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/creator/pages?error=yt_denied`, req.url));
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/creator/pages?error=yt_failed", req.url));
  }

  // Verify user is logged in
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Decode state
  let returnTo = "/creator/pages";
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.sub !== authUser.id) {
      return NextResponse.redirect(new URL("/creator/pages?error=yt_state_mismatch", req.url));
    }
    returnTo = state.returnTo ?? returnTo;
  } catch {
    // Invalid state — continue with default redirect
  }

  try {
    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn, grantedScopes } = await exchangeCodeForTokens(code);

    // Validate all required scopes were granted
    const missing = REQUIRED_YT_SCOPES.filter((s) => !grantedScopes.includes(s));
    if (missing.length > 0) {
      return NextResponse.redirect(new URL(`${returnTo}?error=yt_missing_scopes`, req.url));
    }

    // Fetch YouTube channel profile
    const channel = await fetchChannelProfile(accessToken);

    // Encrypt tokens before storing
    const encAccess = encrypt(accessToken);
    const encRefresh = encrypt(refreshToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Find the user's creator profile
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, creatorProfile: { select: { id: true } } },
    });

    if (!user?.creatorProfile) {
      return NextResponse.redirect(new URL(`${returnTo}?error=yt_no_profile`, req.url));
    }

    const creatorProfileId = user.creatorProfile.id;

    // Upsert: if channelId already exists, transfer ownership
    const existing = await prisma.creatorYtConnection.findUnique({
      where: { channelId: channel.channelId },
      select: { id: true },
    });

    if (existing) {
      await prisma.creatorYtConnection.update({
        where: { id: existing.id },
        data: {
          creatorProfileId,
          channelName: channel.channelName,
          profilePicUrl: channel.profilePictureUrl,
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
          accessToken: encAccess.ciphertext,
          accessTokenIv: encAccess.iv,
          refreshToken: encRefresh.ciphertext,
          refreshTokenIv: encRefresh.iv,
          tokenExpiresAt,
          isVerified: true,
        },
      });
    } else {
      await prisma.creatorYtConnection.create({
        data: {
          creatorProfileId,
          channelId: channel.channelId,
          channelName: channel.channelName,
          profilePicUrl: channel.profilePictureUrl,
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
          accessToken: encAccess.ciphertext,
          accessTokenIv: encAccess.iv,
          refreshToken: encRefresh.ciphertext,
          refreshTokenIv: encRefresh.iv,
          tokenExpiresAt,
          isVerified: true,
        },
      });
    }

    return NextResponse.redirect(new URL(`${returnTo}?youtube=linked`, req.url));
  } catch (err) {
    console.error("[youtube oauth]", err);
    return NextResponse.redirect(new URL(`${returnTo}?error=yt_error`, req.url));
  }
}
