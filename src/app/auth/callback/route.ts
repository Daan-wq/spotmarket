import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { joinDiscordGuildWithOAuthToken } from "@/lib/discord-campaign-roles";

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
  const nextUrl = new URL(next, origin);
  const clickId = nextUrl.searchParams.get("click");

  if (clickId) {
    await prisma.campaignReferralAttribution.updateMany({
      where: { clickId, signedUpAt: null },
      data: { signedUpAt: new Date() },
    });
  }

  // Discord account connection: auto-join guild while provider_token is available.
  if (provider === "discord" && session.provider_token) {
    const discordId = user.user_metadata?.provider_id ?? user.user_metadata?.sub;
    if (discordId) {
      try {
        const joined = await joinDiscordGuildWithOAuthToken(discordId, session.provider_token);
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
  }

  // Check if Prisma user record exists
  const existingUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (existingUser) {
    // Update Discord info if signing in via Discord and not yet stored
    if (provider === "discord" && !existingUser.discordId) {
      const discordId = user.user_metadata?.provider_id ?? user.user_metadata?.sub;
      const discordUsername = user.user_metadata?.full_name ?? user.user_metadata?.name;
      if (discordId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { discordId, discordUsername: discordUsername ?? null },
        });
      }
    }

    // Existing user → go to requested page or role-based dashboard
    return NextResponse.redirect(`${origin}${next}`);
  }

  // New OAuth user → redirect to onboarding
  return NextResponse.redirect(`${origin}${next}`);
}
