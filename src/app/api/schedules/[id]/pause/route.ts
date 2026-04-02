import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  pausedUntil: z.string().datetime().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const schedule = await prisma.postSchedule.findUnique({
      where: { id },
      select: { creatorId: true },
    });
    if (!schedule || schedule.creatorId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await prisma.postSchedule.update({
      where: { id },
      data: { pausedUntil: parsed.data.pausedUntil ? new Date(parsed.data.pausedUntil) : null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /schedules/[id]/pause error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
