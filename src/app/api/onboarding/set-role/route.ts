import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const ALLOWED_ROLES: UserRole[] = [UserRole.creator, UserRole.network];

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const role = body.role as UserRole;

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { role },
  });

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { role },
    create: { supabaseId: authUser.id, email: authUser.email ?? "", role },
    include: { creatorProfile: true },
  });

  if (role === UserRole.creator && !user.creatorProfile) {
    await prisma.creatorProfile.create({
      data: { userId: user.id, displayName: "New Creator" },
    });
  }

  return NextResponse.json({ success: true, role });
}
