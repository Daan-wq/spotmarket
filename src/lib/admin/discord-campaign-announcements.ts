import type { Prisma } from "@prisma/client";
import { discordMessageUrl, sendDiscordMessage } from "@/lib/admin/discord";
import { prisma } from "@/lib/prisma";

type CampaignAnnouncementCampaign = {
  id: string;
  name: string;
  platforms?: string[] | null;
  contentType?: string | null;
  description?: string | null;
  requirements?: string | null;
  contentGuidelines?: string | null;
  requiredHashtags?: string[] | null;
  referralLink?: string | null;
  briefAssetUrl?: string | null;
  guidelinesUrl?: string | null;
  contentAssetUrls?: string[] | null;
  creatorCpv?: unknown;
  minimumPaidViews?: number | null;
  maximumPaidViews?: number | null;
  discordAnnouncementMessageId?: string | null;
};

export type CampaignAnnouncementResult =
  | { status: "sent"; channelId: string; messageId: string; url?: string }
  | { status: "skipped"; reason: "already_sent"; messageId: string };

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE_SHORTS: "YouTube Shorts",
  FACEBOOK: "Facebook",
  X: "X",
};

export function buildCampaignAnnouncementContent(campaign: CampaignAnnouncementCampaign): string {
  const platforms = campaign.platforms?.length
    ? joinWithAmpersand(campaign.platforms.map((platform) => PLATFORM_LABELS[platform] ?? platform))
    : "Alle platformen";
  const cpm = formatEuro(toNumber(campaign.creatorCpv) * 1_000);
  const links = buildLinkLines(campaign);
  const rules = buildRuleLines(campaign);

  return [
    "🚨 NIEUWE CAMPAGNE 🚨",
    "",
    `**${campaign.name}** 🎥`,
    ...(campaign.description ? splitTextLines(campaign.description) : []),
    "",
    "📋 **Campagne details**",
    `Platform: ${platforms}`,
    `Type: ${campaign.contentType?.trim() || "Clipping"}`,
    `CPM: ${cpm} / 1k views`,
    `Minimum views: ${formatInteger(campaign.minimumPaidViews ?? 0)}`,
    campaign.maximumPaidViews ? `Maximum views: ${formatInteger(campaign.maximumPaidViews)}` : "Maximum views: geen limiet",
    "Status: 🟢 Actief",
    ...(links.length ? ["", "🔗 **Links**", ...links] : []),
    ...(rules.length ? ["", "🟨 **Regels**", ...rules] : []),
  ].join("\n");
}

export async function sendCampaignAnnouncementOnce({
  campaign,
  userId,
}: {
  campaign: CampaignAnnouncementCampaign;
  userId: string;
}): Promise<CampaignAnnouncementResult> {
  if (campaign.discordAnnouncementMessageId) {
    return {
      status: "skipped",
      reason: "already_sent",
      messageId: campaign.discordAnnouncementMessageId,
    };
  }

  const content = buildCampaignAnnouncementContent(campaign);
  let channelId = "";

  try {
    channelId = getCampaignAnnouncementChannelId();
    const sent = await sendDiscordMessage({ channelId, content, files: [] });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        discordAnnouncementChannelId: channelId,
        discordAnnouncementMessageId: sent.id,
        discordAnnouncementSentAt: new Date(),
      },
    });

    await writeAnnouncementAudit({
      userId,
      action: "discord.campaign_announcement.sent",
      campaignId: campaign.id,
      metadata: {
        channelId,
        messageId: sent.id,
        contentLength: content.length,
      },
    });

    return {
      status: "sent",
      channelId,
      messageId: sent.id,
      url: safeDiscordMessageUrl(channelId, sent.id),
    };
  } catch (error) {
    await writeAnnouncementAudit({
      userId,
      action: "discord.campaign_announcement.failed",
      campaignId: campaign.id,
      metadata: {
        channelId: channelId || "not_configured",
        contentLength: content.length,
        error: sanitizeAnnouncementError(error),
      },
    });
    throw error;
  }
}

function getCampaignAnnouncementChannelId(): string {
  const channelId = process.env.DISCORD_CAMPAIGN_CHANNEL_ID?.trim();
  if (!channelId) throw new Error("DISCORD_CAMPAIGN_CHANNEL_ID is not configured");
  return channelId;
}

function buildLinkLines(campaign: CampaignAnnouncementCampaign): string[] {
  return [
    campaign.referralLink ? `Campagne link: ${campaign.referralLink}` : null,
    campaign.briefAssetUrl ? `Brief: ${campaign.briefAssetUrl}` : null,
    campaign.guidelinesUrl ? `Guidelines: ${campaign.guidelinesUrl}` : null,
    ...(campaign.contentAssetUrls ?? []).map((url, index) => `Asset ${index + 1}: ${url}`),
  ].filter((line): line is string => Boolean(line));
}

function buildRuleLines(campaign: CampaignAnnouncementCampaign): string[] {
  const lines = [
    ...splitTextLines(campaign.requirements),
    ...splitTextLines(campaign.contentGuidelines),
  ].map((line) => `• ${line}`);

  if (campaign.requiredHashtags?.length) {
    lines.push(`• Gebruik ${joinWithDutchAnd(campaign.requiredHashtags)} in je video's`);
  }

  return lines;
}

function splitTextLines(value?: string | null): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) return Number(value.toString());
  return 0;
}

function formatEuro(value: number): string {
  return `€${new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)}`;
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(value);
}

function joinWithAmpersand(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} & ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} & ${values.at(-1)}`;
}

function joinWithDutchAnd(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} en ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} en ${values.at(-1)}`;
}

function safeDiscordMessageUrl(channelId: string, messageId: string): string | undefined {
  try {
    return discordMessageUrl(channelId, messageId);
  } catch {
    return undefined;
  }
}

async function writeAnnouncementAudit({
  userId,
  action,
  campaignId,
  metadata,
}: {
  userId: string;
  action: string;
  campaignId: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "Campaign",
        entityId: campaignId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  } catch (error) {
    console.error("[discord-campaign-announcements] audit log failed", error);
  }
}

function sanitizeAnnouncementError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown Discord announcement error";
  return message.replace(/Bot\s+[A-Za-z0-9._-]+/gi, "Bot [redacted]").slice(0, 500);
}
