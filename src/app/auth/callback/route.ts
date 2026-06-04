import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { joinDiscordGuildWithOAuthToken } from "@/lib/discord-campaign-roles";
import {
  claimUserForAuthIdentity,
  extractDiscordIdentity,
  isAuthIdentityConflict,
} from "@/lib/auth-identity";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/");

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] Session exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/sign-in?auth_error=callback_failed`);
  }

  const { session } = data;
  const user = session.user;
  const provider = user.app_metadata?.provider;
  const discordIdentity = extractDiscordIdentity(user);
  const nextUrl = new URL(next, origin);
  const clickId = nextUrl.searchParams.get("click");

  if (clickId) {
    await prisma.campaignReferralAttribution.updateMany({
      where: { clickId, signedUpAt: null },
      data: { signedUpAt: new Date() },
    });
  }

  if (provider === "discord" && session.provider_token && discordIdentity) {
    try {
      const joined = await joinDiscordGuildWithOAuthToken(discordIdentity.id, session.provider_token);
      if (!joined.ok) {
        console.error("[auth/callback] Guild join failed:", joined.status, joined.body);
      }
    } catch (err) {
      console.error("[auth/callback] Guild join error:", err);
    }

    if (clickId) {
      await prisma.campaignReferralAttribution.updateMany({
        where: { clickId, discordLinkedAt: null },
        data: { discordLinkedAt: new Date() },
      });
    }
  }

  try {
    const existingUser = await claimUserForAuthIdentity(user, { discordIdentity });
    if (existingUser) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } catch (err) {
    if (isAuthIdentityConflict(err)) {
      return NextResponse.redirect(`${origin}/sign-in?auth_error=discord_already_linked`);
    }
    throw err;
  }

  return NextResponse.redirect(`${origin}${next}`);
}
