import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/creator/campaigns?error=discord_failed", req.url));
  }

  // Verify user is logged in
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Decode state
  let returnTo = "/creator/campaigns";
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.sub !== authUser.id) {
      return NextResponse.redirect(new URL("/creator/campaigns?error=discord_state_mismatch", req.url));
    }
    returnTo = state.returnTo ?? returnTo;
  } catch {
    // Invalid state — continue with default redirect
  }

  const clientId = process.env.DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
  const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI!;

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[discord oauth] token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL(`${returnTo}?error=discord_token_failed`, req.url));
    }

    const { access_token } = await tokenRes.json();

    // Get Discord user info
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error("[discord oauth] user fetch failed:", await userRes.text());
      return NextResponse.redirect(new URL(`${returnTo}?error=discord_user_failed`, req.url));
    }

    const discordUser = await userRes.json();

    // Save Discord ID to user record
    await prisma.user.update({
      where: { supabaseId: authUser.id },
      data: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
      },
    });

    return NextResponse.redirect(new URL(`${returnTo}?discord=linked`, req.url));
  } catch (err) {
    console.error("[discord oauth]", err);
    return NextResponse.redirect(new URL(`${returnTo}?error=discord_error`, req.url));
  }
}
