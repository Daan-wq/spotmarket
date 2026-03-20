import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let where: object = {};
  if (user.role === "creator" && user.creatorProfile) {
    where = { creatorProfileId: user.creatorProfile.id };
  } else if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status) where = { ...where, status };

  const payouts = await prisma.payout.findMany({
    where,
    include: {
      application: {
        include: {
          campaign: { select: { name: true, creatorCpv: true } },
          creatorProfile: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payouts);
}
