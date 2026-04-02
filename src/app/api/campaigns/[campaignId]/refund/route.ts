import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const TRON_TX_REGEX = /^[0-9a-fA-F]{64}$/;

const refundSchema = z.object({
  refundTxHash: z.string().refine((v) => TRON_TX_REGEX.test(v), "Invalid Tron transaction hash"),
});

export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true, status: true, totalBudget: true, goalViews: true,
      ownerWalletAddress: true, refundTxHash: true,
    },
  });

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (campaign.status !== "completed" && campaign.status !== "cancelled") {
    return NextResponse.json({ error: "Refund can only be recorded for completed or cancelled campaigns" }, { status: 409 });
  }

  if (campaign.refundTxHash) {
    return NextResponse.json({ error: "Refund already recorded for this campaign" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { refundTxHash: parsed.data.refundTxHash },
    select: { id: true, refundTxHash: true, ownerWalletAddress: true, status: true },
  });

  return NextResponse.json(updated);
}
