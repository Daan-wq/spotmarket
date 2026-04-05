interface CampaignNotification {
  id: string;
  name: string;
  platform: string;
  totalBudget: number;
  businessCpv: number;
  targetCountry?: string | null;
  minEngagementRate: number;
  advertiserBrandName?: string | null;
}

interface CampaignAnnouncement {
  name: string;
  totalBudget: number;
  otherNotes?: string | null;   // stores regions for Discord display
  platform: string;
  contentType?: string | null;
  requirements?: string | null;
}

export async function notifyCampaignLive(campaign: CampaignNotification): Promise<void> {
  const webhookUrl = process.env.DISCORD_DEALS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clipprofit.com";
  const cpmDollars = campaign.businessCpv * 1_000_000;

  const payload = {
    embeds: [
      {
        title: "💰 New Campaign Available",
        color: 0x23a559,
        fields: [
          { name: "Brand", value: campaign.advertiserBrandName ?? campaign.name, inline: true },
          { name: "CPM", value: `$${cpmDollars.toFixed(0)}/1,000 views`, inline: true },
          { name: "Budget", value: `$${campaign.totalBudget.toLocaleString()}`, inline: true },
          { name: "Platform", value: campaign.platform, inline: true },
          ...(campaign.targetCountry ? [{ name: "Target", value: campaign.targetCountry, inline: true }] : []),
          { name: "Min. Engagement", value: `${campaign.minEngagementRate}%`, inline: true },
        ],
        url: `${appUrl}/campaigns`,
        footer: { text: "ClipProfit — Apply in the dashboard" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(err => console.error("[discord webhook]", err));
}

export async function postCampaignAnnouncement(campaign: CampaignAnnouncement): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CAMPAIGN_CHANNEL_ID;
  if (!botToken || !channelId) {
    console.warn("[discord bot] DISCORD_BOT_TOKEN or DISCORD_CAMPAIGN_CHANNEL_ID not set");
    return;
  }

  const PLATFORM_LABELS: Record<string, string> = {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    BOTH: "Instagram & TikTok",
  };

  const sep = "━━━━━━━━━━━━━━━━━━━━━━━━━";
  const budget = new Intl.NumberFormat("de-DE").format(campaign.totalBudget);
  const platformLabel = PLATFORM_LABELS[campaign.platform] ?? campaign.platform;
  const regions = campaign.otherNotes ?? "-";
  const content = campaign.contentType ?? "-";

  const reqs = (campaign.requirements ?? "")
    .split("\n")
    .filter((r) => r.trim().length > 0)
    .map((r) => `↳ ${r.trim()}`)
    .join("\n");

  const message = `${sep}\n      📢 **${campaign.name}**\n${sep}\n\nBUDGET       **€${budget}**\nREGION         ${regions}\nPLATFORMS   ${platformLabel}\nCONTENT       ${content}\n\nREQUIREMENTS\n${reqs}\n\n${sep}\nFull details after application.\n📩  **Send me a dm with your pages and statistics to get approved**\n${sep}`;

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify({ content: message }),
  }).catch((err) => console.error("[discord bot]", err));
}

interface SubmissionReviewNotification {
  creatorDiscordId: string | null;
  status: "APPROVED" | "REJECTED";
  campaignName: string;
  earnedAmount?: number;
  rejectionNote?: string;
}

export async function notifySubmissionReview(params: SubmissionReviewNotification): Promise<void> {
  if (!params.creatorDiscordId) {
    console.warn("[discord notify] Creator has no Discord linked");
    return;
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn("[discord notify] DISCORD_BOT_TOKEN not set");
    return;
  }

  try {
    // Create DM channel
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ recipient_id: params.creatorDiscordId }),
    });

    if (!dmRes.ok) {
      console.error("[discord notify] Failed to create DM:", await dmRes.text());
      return;
    }

    const { id: dmChannelId } = await dmRes.json();

    const content = params.status === "APPROVED"
      ? `Your submission for **${params.campaignName}** was approved! You earned **$${(params.earnedAmount ?? 0).toFixed(2)}**.`
      : `Your submission for **${params.campaignName}** was not approved.\n\nReason: ${params.rejectionNote || "Not specified"}`;

    await fetch(`https://discord.com/api/v10/channels/${dmChannelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.error("[discord notify]", err);
  }
}
