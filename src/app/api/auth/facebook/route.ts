import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFacebookAuthUrl } from "@/lib/facebook";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const returnTo = req.nextUrl.searchParams.get("return_to") ?? "/creator/connections";
  const state = Buffer.from(JSON.stringify({ returnTo, sub: user.id })).toString("base64url");

  const authUrl = getFacebookAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
