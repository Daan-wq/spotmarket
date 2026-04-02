import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  language: z.string().max(10).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
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

    const preset = await prisma.captionPreset.findUnique({ where: { id } });
    if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (preset.userId === null) return NextResponse.json({ error: "Cannot edit system presets" }, { status: 403 });
    if (preset.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const updated = await prisma.captionPreset.update({ where: { id }, data: parsed.data });

    return NextResponse.json({ id: updated.id, title: updated.title });
  } catch (error) {
    console.error("PATCH /caption-presets/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
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

    const preset = await prisma.captionPreset.findUnique({ where: { id } });
    if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (preset.userId === null) return NextResponse.json({ error: "Cannot delete system presets" }, { status: 403 });
    if (preset.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.captionPreset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /caption-presets/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
