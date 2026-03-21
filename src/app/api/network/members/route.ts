import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!user?.networkProfile) return NextResponse.json({ error: "No network profile" }, { status: 403 });

  const members = await prisma.networkMember.findMany({
    where: { networkId: user.networkProfile.id },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({ members });
}
