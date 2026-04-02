import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyCampaignLive } from "@/lib/discord";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminMarginPerM: z.number().min(0).optional().default(25),
  goalViews: z.number().int().positive().optional(),
  rejectReason: z.string().max(1000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
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
    select: { id: true, status: true, totalBudget: true, name: true },
  });

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (campaign.status !== "pending_review") {
    return NextResponse.json({ error: "Campaign is not pending review" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const d = parsed.data;

  if (d.action === "approve") {
    if (!d.goalViews) {
      return NextResponse.json({ error: "goalViews is required to approve a campaign" }, { status: 400 });
    }

    const adminMarginCpv = d.adminMarginPerM / 1_000_000;
    const businessCpv = Number(campaign.totalBudget) / d.goalViews;
    const creatorCpv = businessCpv - adminMarginCpv;

    if (creatorCpv < 0) {
      return NextResponse.json({ error: "Admin margin too high — creator CPV would be negative" }, { status: 400 });
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "active",
        depositConfirmedAt: new Date(),
        adminMargin: adminMarginCpv,
        businessCpv,
        creatorCpv,
        goalViews: BigInt(d.goalViews),
      },
    });

    try {
      await notifyCampaignLive({
        id: campaign.id,
        name: campaign.name,
        platform: "INSTAGRAM",
        totalBudget: Number(campaign.totalBudget),
        businessCpv,
        minEngagementRate: 0,
      });
    } catch {
      // Non-fatal — Discord notification failure should not block approval
    }

    return NextResponse.json(
      JSON.parse(JSON.stringify(updated, (_k, v) => (typeof v === "bigint" ? Number(v) : v)))
    );
  }

  // Reject
  if (!d.rejectReason?.trim()) {
    return NextResponse.json({ error: "rejectReason is required when rejecting" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "cancelled",
      rejectReason: d.rejectReason.trim(),
    },
  });

  return NextResponse.json(
    JSON.parse(JSON.stringify(updated, (_k, v) => (typeof v === "bigint" ? Number(v) : v)))
  );
}
