import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!user?.networkProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const member = await prisma.networkMember.findFirst({
    where: { id: memberId, networkId: user.networkProfile.id },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.networkMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
