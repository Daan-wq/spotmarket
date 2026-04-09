import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, getInstagramProfile } from "@/lib/instagram";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/creator/verify?error=ig_denied`, req.url));
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/creator/verify?error=ig_failed", req.url));
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
      return NextResponse.redirect(new URL("/creator/verify?error=ig_state_mismatch", req.url));
    }
    returnTo = state.returnTo ?? returnTo;
  } catch {
    // Invalid state — continue with default redirect
  }

  try {
    // Exchange code for access token
    const { accessToken, expiresIn } = await exchangeCodeForToken(code);

    // Fetch Instagram profile
    const profile = await getInstagramProfile(accessToken);

    // Encrypt the access token before storing
    const { ciphertext, iv } = encrypt(accessToken);
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Find the user's creator profile
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, creatorProfile: { select: { id: true } } },
    });

    if (!user?.creatorProfile) {
      return NextResponse.redirect(new URL(`${returnTo}?error=ig_no_profile`, req.url));
    }

    const creatorProfileId = user.creatorProfile.id;

    // Check if this username exists under ANY profile (igUsername is globally unique).
    // If so, transfer ownership to current profile. This handles cases where a user
    // re-registers or connects from a different account.
    const existing = await prisma.creatorIgConnection.findUnique({
      where: { igUsername: profile.username },
      select: { id: true },
    });

    if (existing) {
      await prisma.creatorIgConnection.update({
        where: { id: existing.id },
        data: {
          creatorProfileId,
          igUserId: profile.id,
          accessToken: ciphertext,
          accessTokenIv: iv,
          tokenExpiresAt,
          followerCount: profile.followerCount,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
    } else {
      await prisma.creatorIgConnection.create({
        data: {
          creatorProfileId,
          igUsername: profile.username,
          verificationCode: `OAUTH_${Date.now()}`,
          igUserId: profile.id,
          accessToken: ciphertext,
          accessTokenIv: iv,
          tokenExpiresAt,
          followerCount: profile.followerCount,
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
    }

    // Mark creator profile as verified
    await prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { isVerified: true },
    });

    return NextResponse.redirect(new URL(`${returnTo}?instagram=linked`, req.url));
  } catch (err) {
    console.error("[instagram oauth]", err);
    return NextResponse.redirect(new URL(`${returnTo}?error=ig_error`, req.url));
  }
}
