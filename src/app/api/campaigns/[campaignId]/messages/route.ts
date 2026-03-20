import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  recipientId: z.string(),
});

async function canAccessCampaignMessages(campaignId: string, supabaseId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: { creatorProfile: { select: { id: true } }, businessProfile: { select: { id: true } } },
  });
  if (!user) return { allowed: false };
  if (user.role === "admin") return { allowed: true, dbUserId: user.id };

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { businessProfileId: true } });
  if (!campaign) return { allowed: false };

  if (user.businessProfile?.id === campaign.businessProfileId) return { allowed: true, dbUserId: user.id };

  if (user.creatorProfile) {
    const application = await prisma.campaignApplication.findFirst({
      where: { campaignId, creatorProfileId: user.creatorProfile.id, status: { in: ["approved", "active", "completed"] } },
    });
    if (application) return { allowed: true, dbUserId: user.id };
  }

  return { allowed: false };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  const { allowed } = await canAccessCampaignMessages(campaignId, authUser.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");

  const messages = await prisma.message.findMany({
    where: { campaignId, ...(before && { createdAt: { lt: new Date(before) } }) },
    include: {
      sender: {
        select: {
          supabaseId: true, role: true,
          creatorProfile: { select: { displayName: true } },
          businessProfile: { select: { companyName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(messages.reverse());
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  const { allowed, dbUserId } = await canAccessCampaignMessages(campaignId, authUser.id);
  if (!allowed || !dbUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: parsed.data.recipientId }, select: { id: true } });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: { campaignId, senderId: dbUserId, recipientId: parsed.data.recipientId, content: parsed.data.content },
    include: {
      sender: {
        select: {
          supabaseId: true, role: true,
          creatorProfile: { select: { displayName: true } },
          businessProfile: { select: { companyName: true } },
        },
      },
    },
  });

  try {
    await broadcast(realtimeChannel.campaign(campaignId), REALTIME_EVENTS.NEW_MESSAGE, message as Record<string, unknown>);
  } catch (err) {
    console.error("Realtime broadcast failed:", err);
  }

  return NextResponse.json(message, { status: 201 });
}
