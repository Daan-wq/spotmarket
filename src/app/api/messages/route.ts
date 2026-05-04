import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createMessageSchema = z.object({
  campaignId: z.string(),
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
  submissionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator", "admin");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { campaignId, receiverId, content, submissionId } = parsed.data;

    const message = await prisma.message.create({
      data: {
        campaignId,
        senderId: user.id,
        receiverId,
        content,
        submissionId,
      },
    });

    return NextResponse.json({ id: message.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
