import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  language: z.string().max(10).optional(),
  category: z.string().max(50).optional(),
});

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    const presets = await prisma.captionPreset.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      presets: presets.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        language: p.language,
        category: p.category,
        isSystem: p.userId === null,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /caption-presets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const preset = await prisma.captionPreset.create({
      data: { userId: user.id, ...parsed.data },
    });

    return NextResponse.json({ id: preset.id, title: preset.title });
  } catch (error) {
    console.error("POST /caption-presets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
