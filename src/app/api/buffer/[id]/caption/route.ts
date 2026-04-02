import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  caption: z.string().max(2200).nullable(),
});

export async function PATCH(
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
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    const buffer = await prisma.contentBuffer.findUnique({ where: { id } });
    if (!buffer || buffer.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await prisma.contentBuffer.update({
      where: { id },
      data: { caption: parsed.data.caption },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /buffer/[id]/caption error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
