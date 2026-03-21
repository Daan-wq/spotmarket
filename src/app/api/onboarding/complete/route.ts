import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayName = (body.displayName as string)?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { role: UserRole.creator },
  });

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { role: UserRole.creator },
    create: { supabaseId: authUser.id, email: authUser.email ?? "", role: UserRole.creator },
    include: { creatorProfile: true },
  });

  if (!user.creatorProfile) {
    await prisma.creatorProfile.create({
      data: { userId: user.id, displayName },
    });
  }

  return NextResponse.json({ success: true });
}
