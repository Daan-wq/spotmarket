import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REQUIRED_DISCORD_SCOPES } from "@/lib/discord";
import { joinDiscordGuildWithOAuthToken } from "@/lib/discord-campaign-roles";
import {
  claimUserForAuthIdentity,
  isAuthIdentityConflict,
  type DiscordIdentity,
} from "@/lib/auth-identity";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/creator/campaigns?error=discord_failed", req.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  let returnTo = "/creator/campaigns";
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.sub !== authUser.id) {
      return NextResponse.redirect(new URL("/creator/campaigns?error=discord_state_mismatch", req.url));
    }
    returnTo = state.returnTo ?? returnTo;
  } catch {
    // Invalid state: continue with the default creator campaigns redirect.
  }

  const clientId = process.env.DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
  const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI!;

  try {
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
      const errBody = await tokenRes.text();
      console.error("[discord connection] token exchange failed:", tokenRes.status, errBody);
      console.error("[discord connection] redirect_uri used:", redirectUri);
      console.error("[discord connection] client_id length:", clientId.length, "client_secret length:", clientSecret.length);
      return NextResponse.redirect(new URL(`${returnTo}?error=discord_token_failed`, req.url));
    }

    const tokenJson = await tokenRes.json();
    const access_token: string = tokenJson.access_token;
    const grantedScopes: string[] =
      typeof tokenJson.scope === "string" ? tokenJson.scope.split(/\s+/).filter(Boolean) : [];

    const missing = REQUIRED_DISCORD_SCOPES.filter((scope) => !grantedScopes.includes(scope));
    if (missing.length > 0) {
      return NextResponse.redirect(new URL(`${returnTo}?error=discord_missing_scopes`, req.url));
    }

    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error("[discord connection] user fetch failed:", await userRes.text());
      return NextResponse.redirect(new URL(`${returnTo}?error=discord_user_failed`, req.url));
    }

    const discordUser = await userRes.json();
    const joined = await joinDiscordGuildWithOAuthToken(discordUser.id, access_token);
    if (!joined.ok) {
      console.error("[discord connection] guild join failed:", joined.status, joined.body);
      return NextResponse.redirect(new URL(`${returnTo}?error=discord_guild_join_failed`, req.url));
    }

    const discordIdentity: DiscordIdentity = {
      id: discordUser.id,
      username: typeof discordUser.username === "string" ? discordUser.username : null,
    };

    try {
      const user = await claimUserForAuthIdentity(authUser, { discordIdentity });
      if (!user) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    } catch (err) {
      if (isAuthIdentityConflict(err)) {
        return NextResponse.redirect(new URL(`${returnTo}?error=discord_already_linked`, req.url));
      }
      throw err;
    }

    return NextResponse.redirect(new URL(`${returnTo}?discord=linked`, req.url));
  } catch (err) {
    console.error("[discord connection]", err);
    return NextResponse.redirect(new URL(`${returnTo}?error=discord_error`, req.url));
  }
}
