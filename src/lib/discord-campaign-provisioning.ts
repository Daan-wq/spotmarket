import { prisma } from "@/lib/prisma";
import { ensureDiscordCampaignResources } from "@/lib/discord-campaign-roles";

type CampaignWithDiscordResources = {
  id: string;
  name: string;
  discordRoleId?: string | null;
  discordChannelId?: string | null;
};

export async function ensureDiscordCampaignProvisioning<T extends CampaignWithDiscordResources>(
  campaign: T,
) {
  const resources = await ensureDiscordCampaignResources(campaign);
  const needsUpdate =
    campaign.discordRoleId !== resources.roleId ||
    campaign.discordChannelId !== resources.channelId;

  if (!needsUpdate) {
    return { campaign, resources };
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      discordRoleId: resources.roleId,
      discordChannelId: resources.channelId,
    },
  });

  return { campaign: updated, resources };
}
