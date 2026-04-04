import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/auth";
import { postCampaignAnnouncement } from "@/lib/discord";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      totalBudget: true,
      description: true,
      platform: true,
      contentType: true,
      requirements: true,
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await postCampaignAnnouncement({
    name: campaign.name,
    totalBudget: Number(campaign.totalBudget),
    description: campaign.description,
    platform: campaign.platform,
    contentType: campaign.contentType,
    requirements: campaign.requirements,
  });

  return NextResponse.json({ success: true });
}
