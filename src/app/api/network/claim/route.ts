import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const claimSchema = z.object({
  campaignId: z.string(),
  slotCount: z.number().int().positive().max(500),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile?.isApproved) {
    return NextResponse.json({ error: "Network not approved" }, { status: 403 });
  }

  const network = dbUser.networkProfile;
  const { campaignId, slotCount } = parsed.data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, status: "active" },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found or not active" }, { status: 404 });

  if (campaign.maxSlots != null && campaign.claimedSlots + slotCount > campaign.maxSlots) {
    return NextResponse.json({ error: "Not enough slots available" }, { status: 409 });
  }

  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, networkId: network.id },
  });
  if (existing) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  const [application] = await prisma.$transaction([
    prisma.campaignApplication.create({
      data: {
        campaignId,
        networkId: network.id,
        status: campaign.requiresApproval ? "pending" : "approved",
        claimType: campaign.requiresApproval ? "APPLICATION" : "INSTANT",
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { claimedSlots: { increment: slotCount } },
    }),
  ]);

  return NextResponse.json({ application }, { status: 201 });
}
