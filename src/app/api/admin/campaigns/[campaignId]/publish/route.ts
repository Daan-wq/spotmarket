import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensureDiscordCampaignProvisioning } from "@/lib/discord-campaign-provisioning";
import { sendCampaignAnnouncementOnce } from "@/lib/admin/discord-campaign-announcements";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  let auth: Awaited<ReturnType<typeof requireAuth>>;
  try {
    auth = await requireAuth("admin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
  }

  const { campaignId } = await params;
  const admin = await prisma.user.findUnique({
    where: { supabaseId: auth.userId },
    select: { id: true },
  });
  if (!admin) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provisioned = await ensureDiscordCampaignProvisioning(campaign);
  const campaignForAnnouncement =
    provisioned.campaign.status === "active"
      ? provisioned.campaign
      : await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "active" },
        });

  try {
    const discordAnnouncement = await sendCampaignAnnouncementOnce({
      campaign: campaignForAnnouncement,
      userId: admin.id,
    });

    return NextResponse.json({
      success: true,
      discordAnnouncement,
      discordProvisioning: provisioned.resources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord announcement failed";
    return NextResponse.json(
      {
        success: false,
        error: message,
        discordAnnouncement: { status: "failed", error: message },
        discordProvisioning: provisioned.resources,
      },
      { status: 502 },
    );
  }
}
