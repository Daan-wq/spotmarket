interface CampaignNotification {
  id: string;
  name: string;
  platform: string;
  totalBudget: number;
  businessCpv: number;
  targetCountry?: string | null;
  targetGeo?: string[] | null;
  minEngagementRate: number;
}

interface CampaignAnnouncement {
  name: string;
  totalBudget: number;
  otherNotes?: string | null;   // stores regions for Discord display
  platform: string;
  platforms?: string[];
  contentType?: string | null;
  requirements?: string | null;
  minAge?: string | null;
  pageStats?: string | null;    // JSON string of selected stats
  targetCountry?: string | null;
  targetGeo?: string[] | null;
}

type Region = "NL" | "INT" | "BOTH";

const NL_TOKENS = new Set(["NL", "NLD", "NETHERLANDS", "DUTCH", "HOLLAND"]);

function detectRegion(input: { targetCountry?: string | null; targetGeo?: string[] | null; otherNotes?: string | null }): Region {
  const tokens: string[] = [];
  if (input.targetCountry) tokens.push(input.targetCountry.toUpperCase().trim());
  if (input.targetGeo) tokens.push(...input.targetGeo.map((g) => g.toUpperCase().trim()));
  if (input.otherNotes) {
    // otherNotes is a free-text region string; treat any uppercase NL token as a hit
    const upper = input.otherNotes.toUpperCase();
    for (const tok of NL_TOKENS) if (upper.includes(tok)) tokens.push(tok);
  }

  if (tokens.length === 0) return "INT"; // unspecified → default to international audience

  const hasNL = tokens.some((t) => NL_TOKENS.has(t));
  const hasOther = tokens.some((t) => t.length > 0 && !NL_TOKENS.has(t));

  if (hasNL && hasOther) return "BOTH";
  if (hasNL) return "NL";
  return "INT";
}

interface ChannelTarget {
  channelId: string;
  roleId?: string;
}

function targetsForRegion(region: Region): ChannelTarget[] {
  const targets: ChannelTarget[] = [];
  const nlChannel = process.env.DISCORD_NL_CAMPAIGNS_CHANNEL_ID;
  const intChannel = process.env.DISCORD_INT_CAMPAIGNS_CHANNEL_ID;
  const dutchRole = process.env.DUTCH_ROLE_ID;
  const intRole = process.env.INT_ROLE_ID;

  if (region === "NL" || region === "BOTH") {
    if (nlChannel) targets.push({ channelId: nlChannel, roleId: dutchRole });
  }
  if (region === "INT" || region === "BOTH") {
    if (intChannel) targets.push({ channelId: intChannel, roleId: intRole });
  }
  return targets;
}

async function postViaBot(
  channelId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.warn("[discord] DISCORD_BOT_TOKEN not set — skipping channel post");
    return;
  }
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[discord] post to channel ${channelId} failed (${res.status}): ${text}`);
  }
}

export async function notifyCampaignLive(campaign: CampaignNotification): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clipprofit.com";
  const cpmDollars = campaign.businessCpv * 1_000_000;

  const embed = {
    title: "💰 New Campaign Available",
    color: 0x23a559,
    fields: [
      { name: "Campaign", value: campaign.name, inline: true },
      { name: "CPM", value: `$${cpmDollars.toFixed(0)}/1,000 views`, inline: true },
      { name: "Budget", value: `$${campaign.totalBudget.toLocaleString()}`, inline: true },
      { name: "Platform", value: campaign.platform, inline: true },
      ...(campaign.targetCountry ? [{ name: "Target", value: campaign.targetCountry, inline: true }] : []),
      { name: "Min. Engagement", value: `${campaign.minEngagementRate}%`, inline: true },
    ],
    url: `${appUrl}/campaigns`,
    footer: { text: "ClipProfit — Apply in the dashboard" },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Apply Now",
          url: `${appUrl}/creator/campaigns/${campaign.id}`,
        },
      ],
    },
  ];

  const region = detectRegion(campaign);
  const targets = targetsForRegion(region);

  if (targets.length === 0) {
    // Fallback to legacy single webhook if NL/INT routing is not configured
    const webhookUrl = process.env.DISCORD_DEALS_WEBHOOK_URL;
    if (!webhookUrl) return;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed], components }),
    }).catch((err) => console.error("[discord webhook]", err));
    return;
  }

  for (const target of targets) {
    const content = target.roleId ? `<@&${target.roleId}>` : undefined;
    await postViaBot(target.channelId, {
      ...(content ? { content } : {}),
      embeds: [embed],
      components,
      allowed_mentions: target.roleId ? { roles: [target.roleId] } : { parse: [] },
    });
  }
}

export async function postCampaignAnnouncement(campaign: CampaignAnnouncement): Promise<void> {
  const PLATFORM_LABELS: Record<string, string> = {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    YOUTUBE_SHORTS: "YouTube Shorts",
    FACEBOOK: "Facebook",
    X: "X",
    BOTH: "Instagram & TikTok",
  };

  const budget = new Intl.NumberFormat("de-DE").format(campaign.totalBudget);

  // Build platform label from platforms array or fallback to single platform
  const platformLabel = campaign.platforms && campaign.platforms.length > 0
    ? campaign.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(" · ")
    : PLATFORM_LABELS[campaign.platform] ?? campaign.platform;

  // Build description lines — only include fields that have values
  const lines: string[] = [];
  lines.push(`💰 **Budget**       €${budget}`);
  if (campaign.otherNotes) {
    lines.push(`🌍 **Region**        ${campaign.otherNotes}`);
  }
  lines.push(`📱 **Platforms**    ${platformLabel}`);
  if (campaign.contentType) {
    lines.push(`🎬 **Content**      ${campaign.contentType}`);
  }
  if (campaign.minAge) {
    lines.push(`👤 **Age**             ${campaign.minAge}`);
  }

  // Requirements as checkmarks
  const reqs = (campaign.requirements ?? "")
    .split("\n")
    .filter((r) => r.trim().length > 0)
    .map((r) => `✅ ${r.trim()}`)
    .join("\n");

  const descParts = [lines.join("\n")];
  if (reqs) descParts.push("", reqs);
  descParts.push("", "Full brief after approval.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clipprofit.com";

  const embed = {
    title: `📢 ${campaign.name}`,
    description: descParts.join("\n"),
    color: 0x534AB7,
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Apply to start earning 💵",
          url: `${appUrl}/sign-up`,
        },
      ],
    },
  ];

  const region = detectRegion(campaign);
  const targets = targetsForRegion(region);

  if (targets.length === 0) {
    // Fallback to legacy single channel via DISCORD_CAMPAIGN_CHANNEL_ID
    const legacyChannelId = process.env.DISCORD_CAMPAIGN_CHANNEL_ID;
    if (!legacyChannelId) {
      console.warn("[discord bot] No NL/INT channels and no legacy DISCORD_CAMPAIGN_CHANNEL_ID — skipping announcement");
      return;
    }
    await postViaBot(legacyChannelId, { embeds: [embed], components });
    return;
  }

  for (const target of targets) {
    const content = target.roleId ? `<@&${target.roleId}>` : undefined;
    await postViaBot(target.channelId, {
      ...(content ? { content } : {}),
      embeds: [embed],
      components,
      allowed_mentions: target.roleId ? { roles: [target.roleId] } : { parse: [] },
    });
  }
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
