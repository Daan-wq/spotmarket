import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/instagram";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
