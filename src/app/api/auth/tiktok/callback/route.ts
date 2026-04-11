import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, fetchTikTokProfile } from "@/lib/tiktok";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/creator/pages?error=tt_denied", req.url));
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/creator/pages?error=tt_failed", req.url));
  }

  // Verify user is logged in
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Decode and validate state (CSRF protection)
  let returnTo = "/creator/pages";
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.sub !== authUser.id) {
      return NextResponse.redirect(new URL("/creator/pages?error=tt_state_mismatch", req.url));
    }
    returnTo = state.returnTo ?? returnTo;
  } catch {
    // Invalid state — continue with default redirect
  }

  try {
    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn, openId } = await exchangeCodeForTokens(code);

    // Fetch TikTok profile
    const ttProfile = await fetchTikTokProfile(accessToken);

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
      return NextResponse.redirect(new URL(`${returnTo}?error=tt_no_profile`, req.url));
    }

    const creatorProfileId = user.creatorProfile.id;

    // Upsert on tikTokOpenId
    const existing = await prisma.creatorTikTokConnection.findUnique({
      where: { tikTokOpenId: openId },
      select: { id: true },
    });

    if (existing) {
      await prisma.creatorTikTokConnection.update({
        where: { id: existing.id },
        data: {
          creatorProfileId,
          username: ttProfile.username,
          displayName: ttProfile.displayName,
          profilePicUrl: ttProfile.avatarUrl,
          followerCount: ttProfile.followerCount,
          accessToken: encAccess.ciphertext,
          accessTokenIv: encAccess.iv,
          refreshToken: encRefresh.ciphertext,
          refreshTokenIv: encRefresh.iv,
          tokenExpiresAt,
          isVerified: true,
        },
      });
    } else {
      await prisma.creatorTikTokConnection.create({
        data: {
          creatorProfileId,
          tikTokOpenId: openId,
          username: ttProfile.username,
          displayName: ttProfile.displayName,
          profilePicUrl: ttProfile.avatarUrl,
          followerCount: ttProfile.followerCount,
          accessToken: encAccess.ciphertext,
          accessTokenIv: encAccess.iv,
          refreshToken: encRefresh.ciphertext,
          refreshTokenIv: encRefresh.iv,
          tokenExpiresAt,
          isVerified: true,
        },
      });
    }

    return NextResponse.redirect(new URL(`${returnTo}?tiktok=linked`, req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[tiktok oauth]", msg);
    const errParam = encodeURIComponent(msg.slice(0, 200));
    return NextResponse.redirect(new URL(`${returnTo}?error=tt_error&detail=${errParam}`, req.url));
  }
}
