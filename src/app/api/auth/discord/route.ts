import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDiscordAuthUrl } from "@/lib/discord";

export async function GET(req: NextRequest) {
  // Ensure user is logged in
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Discord account connection is not configured" },
      { status: 500 }
    );
  }

  const returnTo = req.nextUrl.searchParams.get("return_to") ?? "/creator/campaigns";
  const state = Buffer.from(JSON.stringify({ returnTo, sub: user.id })).toString("base64url");

  return NextResponse.redirect(getDiscordAuthUrl({ clientId, redirectUri, state }));
}
