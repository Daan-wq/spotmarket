import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/auth";
import { ensureDiscordCampaignProvisioning } from "@/lib/discord-campaign-provisioning";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provisioned = await ensureDiscordCampaignProvisioning(campaign);

  return NextResponse.json({
    success: true,
    discordAnnouncement: "disabled",
    discordProvisioning: provisioned.resources,
  });
}
