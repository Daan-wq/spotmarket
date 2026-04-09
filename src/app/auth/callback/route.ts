import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID ?? "1486482870272000102";

async function joinDiscordGuild(discordUserId: string, accessToken: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn("[auth/callback] DISCORD_BOT_TOKEN not set, skipping guild join");
    return;
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: accessToken }),
      }
    );

    if (res.status === 201) {
      console.log(`[auth/callback] Added user ${discordUserId} to guild`);
    } else if (res.status === 204) {
      console.log(`[auth/callback] User ${discordUserId} already in guild`);
    } else {
      console.error("[auth/callback] Guild join failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[auth/callback] Guild join error:", err);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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

  // Discord OAuth: auto-join guild (must happen now while provider_token is available)
  if (provider === "discord" && session.provider_token) {
    const discordId = user.user_metadata?.provider_id ?? user.user_metadata?.sub;
    if (discordId) {
      await joinDiscordGuild(discordId, session.provider_token);
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
  return NextResponse.redirect(`${origin}/onboarding`);
}
