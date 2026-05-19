import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeFbCodeForToken,
  FacebookOAuthError,
  fetchFacebookPageProfile,
  fetchFacebookUserId,
  fetchUserPages,
  getFacebookOAuthRedirectDetail,
  REQUIRED_FB_SCOPES,
} from "@/lib/facebook";
import { encrypt } from "@/lib/crypto";
import { recordAccountRefreshSuccess } from "@/lib/social-account-refresh";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/creator/connections?error=fb_denied", req.url));
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/creator/connections?error=fb_failed", req.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  let returnTo = "/creator/connections";
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.sub !== authUser.id) {
      return NextResponse.redirect(new URL("/creator/connections?error=fb_state_mismatch", req.url));
    }
    returnTo = state.returnTo ?? returnTo;
  } catch {
    // Invalid state — continue with default redirect
  }

  try {
    // Exchange code for long-lived user token
    const { accessToken: userToken, grantedScopes } = await exchangeFbCodeForToken(code);

    // Validate all required scopes were granted
    const missing = REQUIRED_FB_SCOPES.filter((s) => !grantedScopes.includes(s));
    if (missing.length > 0) {
      return NextResponse.redirect(new URL(`${returnTo}?error=fb_missing_scopes`, req.url));
    }

    // Capture the FB user_id (used for deauthorize/data-deletion webhook mapping)
    const fbUserId = await fetchFacebookUserId(userToken);

    // Fetch pages the user manages (returns never-expiring page tokens)
    const pages = await fetchUserPages(userToken);

    if (pages.length === 0) {
      return NextResponse.redirect(new URL(`${returnTo}?error=fb_no_pages`, req.url));
    }

    // Find creator profile
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, creatorProfile: { select: { id: true } } },
    });

    if (!user?.creatorProfile) {
      return NextResponse.redirect(new URL(`${returnTo}?error=fb_no_profile`, req.url));
    }

    const creatorProfileId = user.creatorProfile.id;
    const authorizedPageIds: string[] = [];

    for (const page of pages) {
      authorizedPageIds.push(page.id);

      // Fetch page profile for follower count, handle, and profile image.
      const pageProfile = await fetchFacebookPageProfile(page.id, page.accessToken);
      const { ciphertext, iv } = encrypt(page.accessToken);
      const verifiedAt = new Date();
      const connectionData = {
        creatorProfileId,
        fbUserId: fbUserId ?? undefined,
        pageName: pageProfile.name || page.name,
        pageHandle: pageProfile.username,
        profilePicUrl: pageProfile.profilePictureUrl || null,
        followerCount: pageProfile.followerCount,
        accessToken: ciphertext,
        accessTokenIv: iv,
        tokenExpiresAt: null, // Page tokens don't expire
        isVerified: true,
        verifiedAt,
      };

      // Upsert: if this page is already connected, update and transfer ownership.
      const existing = await prisma.creatorFbConnection.findUnique({
        where: { fbPageId: page.id },
        select: { id: true },
      });

      const connection = existing
        ? await prisma.creatorFbConnection.update({
          where: { id: existing.id },
          data: connectionData,
          select: { id: true },
        })
        : await prisma.creatorFbConnection.create({
          data: {
            ...connectionData,
            fbPageId: page.id,
          },
          select: { id: true },
        });

      await recordAccountRefreshSuccess({
        connectionType: "FB",
        connectionId: connection.id,
        audienceCount: pageProfile.followerCount,
        raw: pageProfile,
        capturedAt: verifiedAt,
      });
    }

    if (fbUserId) {
      await prisma.creatorFbConnection.deleteMany({
        where: {
          creatorProfileId,
          fbUserId,
          fbPageId: { notIn: authorizedPageIds },
        },
      });
    }

    return NextResponse.redirect(new URL(`${returnTo}?facebook=linked`, req.url));
  } catch (err) {
    const detail = getFacebookOAuthRedirectDetail(err);
    console.error("[facebook oauth] error:", {
      message: err instanceof Error ? err.message : String(err),
      detail,
      ...(err instanceof FacebookOAuthError
        ? {
            operation: err.operation,
            status: err.status,
            providerError: err.providerError,
          }
        : {}),
    });
    return NextResponse.redirect(new URL(`${returnTo}?error=fb_error&detail=${detail}`, req.url));
  }
}
