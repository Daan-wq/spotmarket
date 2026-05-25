const DEFAULT_DISCORD_GUILD_ID = "1486482870272000102";

const CAMPAIGN_ROLE_MATCHERS = [
  {
    roleId:
      process.env.DISCORD_BRAMS_FRUIT_CAMPAIGN_ROLE_ID ??
      process.env.DISCORD_BRONSPRUIT_CAMPAIGN_ROLE_ID ??
      "1508425202168500366",
    names: [
      "bram's fruit clipping",
      "bram's fruit",
      "brams fruit",
      "bronspruit",
      "bramsvrijheid",
    ],
  },
  {
    roleId:
      process.env.DISCORD_CLIPPROFIT_CAMPAIGN_ROLE_ID ??
      process.env.DISCORD_CLEAR_PROFIT_CAMPAIGN_ROLE_ID ??
      "1508425840571191376",
    names: ["clipprofit", "clear profit"],
  },
] as const;

type DiscordCampaign = {
  id: string;
  name: string;
};

export class DiscordCampaignRoleError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "DiscordCampaignRoleError";
  }
}

function getDiscordBotToken() {
  return process.env.DISCORD_BOT_TOKEN;
}

function getDiscordGuildId() {
  return process.env.DISCORD_GUILD_ID ?? DEFAULT_DISCORD_GUILD_ID;
}

function normalizeCampaignName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getDiscordCampaignRoleId(campaign: DiscordCampaign) {
  const configured = process.env[`DISCORD_CAMPAIGN_ROLE_${campaign.id}`];
  if (configured) return configured;

  const campaignName = normalizeCampaignName(campaign.name);
  const match = CAMPAIGN_ROLE_MATCHERS.find((candidate) =>
    candidate.names.some((name) => campaignName.includes(normalizeCampaignName(name))),
  );

  return match?.roleId ?? null;
}

async function discordFetch(path: string, init: RequestInit = {}) {
  const token = getDiscordBotToken();
  if (!token) {
    throw new DiscordCampaignRoleError(
      "DISCORD_CONFIG_MISSING",
      "Discord role sync is not configured.",
      500,
    );
  }

  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function joinDiscordGuildWithOAuthToken(
  discordUserId: string,
  accessToken: string,
) {
  const guildId = getDiscordGuildId();
  const response = await discordFetch(`/guilds/${guildId}/members/${discordUserId}`, {
    method: "PUT",
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (response.status === 201 || response.status === 204) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: response.status,
    body: await response.text().catch(() => ""),
  };
}

export async function addDiscordCampaignRole(campaign: DiscordCampaign, discordUserId: string) {
  const roleId = getDiscordCampaignRoleId(campaign);
  if (!roleId) return { skipped: true as const };

  const guildId = getDiscordGuildId();
  const response = await discordFetch(
    `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "PUT" },
  );

  if (response.status === 204) return { skipped: false as const };

  if (response.status === 404) {
    throw new DiscordCampaignRoleError(
      "DISCORD_GUILD_MEMBER_REQUIRED",
      "Reconnect Discord so we can add you to the ClipProfit Discord server before joining this campaign.",
      400,
    );
  }

  throw new DiscordCampaignRoleError(
    "DISCORD_ROLE_ASSIGN_FAILED",
    "Discord role assignment failed. Please try again in a moment.",
  );
}

export async function removeDiscordCampaignRole(
  campaign: DiscordCampaign,
  discordUserId: string,
) {
  const roleId = getDiscordCampaignRoleId(campaign);
  if (!roleId) return { skipped: true as const };

  const guildId = getDiscordGuildId();
  const response = await discordFetch(
    `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "DELETE" },
  );

  if (response.status === 204 || response.status === 404) {
    return { skipped: false as const };
  }

  throw new DiscordCampaignRoleError(
    "DISCORD_ROLE_REMOVE_FAILED",
    "Discord role removal failed. Please try again in a moment.",
  );
}
