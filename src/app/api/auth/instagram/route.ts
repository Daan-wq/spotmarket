import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/instagram";
import { prisma } from "@/lib/prisma";
import { rateLimit, AUTH_LIMIT, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const { success, headers: rlHeaders } = rateLimit(`auth_ig_${ip}`, AUTH_LIMIT);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rlHeaders },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  const state = Buffer.from(authUser.id).toString("base64url");
  const authUrl = await getInstagramAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
