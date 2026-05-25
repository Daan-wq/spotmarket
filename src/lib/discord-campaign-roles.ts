const DEFAULT_DISCORD_GUILD_ID = "1486482870272000102";
const DEFAULT_DISCORD_CAMPAIGN_CATEGORY_ID = "1486731263334416645";
const DEFAULT_DISCORD_MODERATOR_ROLE_IDS = ["1486502467221852261"];

const DISCORD_CHANNEL_TYPE_TEXT = 0;
const DISCORD_CHANNEL_TYPE_CATEGORY = 4;
const DISCORD_OVERWRITE_TYPE_ROLE = 0;
const DISCORD_PERMISSION_VIEW_CHANNEL = 1 << 10;
const DISCORD_PERMISSION_SEND_MESSAGES = 1 << 11;
const DISCORD_PERMISSION_EMBED_LINKS = 1 << 14;
const DISCORD_PERMISSION_ATTACH_FILES = 1 << 15;
const DISCORD_PERMISSION_READ_MESSAGE_HISTORY = 1 << 16;
const DISCORD_CAMPAIGN_CHANNEL_ALLOW =
  DISCORD_PERMISSION_VIEW_CHANNEL |
  DISCORD_PERMISSION_SEND_MESSAGES |
  DISCORD_PERMISSION_EMBED_LINKS |
  DISCORD_PERMISSION_ATTACH_FILES |
  DISCORD_PERMISSION_READ_MESSAGE_HISTORY;

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
  discordRoleId?: string | null;
  discordChannelId?: string | null;
};

type DiscordRole = {
  id: string;
  name: string;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
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

function getDiscordCampaignCategoryId() {
  return process.env.DISCORD_CAMPAIGN_CATEGORY_ID ?? DEFAULT_DISCORD_CAMPAIGN_CATEGORY_ID;
}

function getDiscordModeratorRoleIds() {
  return (
    process.env.DISCORD_CAMPAIGN_MODERATOR_ROLE_IDS?.split(",")
      .map((roleId) => roleId.trim())
      .filter(Boolean) ?? DEFAULT_DISCORD_MODERATOR_ROLE_IDS
  );
}

function normalizeCampaignName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function campaignNameWords(value: string) {
  return normalizeCampaignName(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, ""),
  )
    .split(" ")
    .filter(Boolean);
}

function stripCampaignSuffixWords(words: string[]) {
  const suffixes = new Set(["campaign", "campagne", "clipping"]);
  const result = [...words];
  while (result.length > 1 && suffixes.has(result[result.length - 1]!)) {
    result.pop();
  }
  return result;
}

function campaignDisplayNameWithoutSuffix(value: string) {
  const originalWords = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const normalizedWords = campaignNameWords(value);

  while (
    originalWords.length > 1 &&
    normalizedWords.length > 1 &&
    ["campaign", "campagne", "clipping"].includes(normalizedWords[normalizedWords.length - 1]!)
  ) {
    originalWords.pop();
    normalizedWords.pop();
  }

  return originalWords.join(" ");
}

export function getDiscordCampaignRoleName(campaign: DiscordCampaign) {
  const base = campaignDisplayNameWithoutSuffix(campaign.name) || campaign.id;
  return `${base} Campagne`;
}

export function getDiscordCampaignChannelName(campaign: DiscordCampaign) {
  const words = stripCampaignSuffixWords(campaignNameWords(campaign.name));
  const compact = words.join("") || campaign.id.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `💬│${compact}-chat`;
}

export function getDiscordCampaignRoleId(campaign: DiscordCampaign) {
  if (campaign.discordRoleId) return campaign.discordRoleId;

  const configured = process.env[`DISCORD_CAMPAIGN_ROLE_${campaign.id}`];
  if (configured) return configured;

  const campaignName = normalizeCampaignName(campaign.name);
  const match = CAMPAIGN_ROLE_MATCHERS.find((candidate) =>
    candidate.names.some((name) => campaignName.includes(normalizeCampaignName(name))),
  );

  return match?.roleId ?? null;
}

async function readDiscordError(response: Response) {
  return response.text().catch(() => "");
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

async function assertDiscordOk(response: Response, code: string, message: string) {
  if (response.ok) return;

  throw new DiscordCampaignRoleError(
    code,
    `${message} Discord responded with ${response.status}: ${await readDiscordError(response)}`,
  );
}

async function getGuildRoles() {
  const response = await discordFetch(`/guilds/${getDiscordGuildId()}/roles`);
  await assertDiscordOk(
    response,
    "DISCORD_ROLE_LOOKUP_FAILED",
    "Failed to inspect Discord roles.",
  );
  return (await response.json()) as DiscordRole[];
}

async function getGuildChannels() {
  const response = await discordFetch(`/guilds/${getDiscordGuildId()}/channels`);
  await assertDiscordOk(
    response,
    "DISCORD_CHANNEL_LOOKUP_FAILED",
    "Failed to inspect Discord channels.",
  );
  return (await response.json()) as DiscordChannel[];
}

async function ensureCampaignRole(campaign: DiscordCampaign) {
  const existingRoleId = getDiscordCampaignRoleId(campaign);
  if (existingRoleId) {
    return { roleId: existingRoleId, created: false };
  }

  const roleName = getDiscordCampaignRoleName(campaign);
  const roles = await getGuildRoles();
  const existing = roles.find((role) => role.name.toLowerCase() === roleName.toLowerCase());
  if (existing) return { roleId: existing.id, created: false };

  const response = await discordFetch(`/guilds/${getDiscordGuildId()}/roles`, {
    method: "POST",
    body: JSON.stringify({
      name: roleName,
      permissions: "0",
      mentionable: false,
    }),
  });
  await assertDiscordOk(
    response,
    "DISCORD_ROLE_CREATE_FAILED",
    `Failed to create Discord role "${roleName}".`,
  );

  const role = (await response.json()) as DiscordRole;
  return { roleId: role.id, created: true };
}

function channelPermissionOverwrites(roleId: string) {
  const allow = DISCORD_CAMPAIGN_CHANNEL_ALLOW.toString();
  return [
    {
      id: getDiscordGuildId(),
      type: DISCORD_OVERWRITE_TYPE_ROLE,
      allow: "0",
      deny: DISCORD_PERMISSION_VIEW_CHANNEL.toString(),
    },
    ...getDiscordModeratorRoleIds().map((moderatorRoleId) => ({
      id: moderatorRoleId,
      type: DISCORD_OVERWRITE_TYPE_ROLE,
      allow,
      deny: "0",
    })),
    {
      id: roleId,
      type: DISCORD_OVERWRITE_TYPE_ROLE,
      allow,
      deny: "0",
    },
  ];
}

async function putChannelPermissionOverwrite(
  channelId: string,
  overwrite: ReturnType<typeof channelPermissionOverwrites>[number],
) {
  const response = await discordFetch(`/channels/${channelId}/permissions/${overwrite.id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: overwrite.type,
      allow: overwrite.allow,
      deny: overwrite.deny,
    }),
  });
  await assertDiscordOk(
    response,
    "DISCORD_CHANNEL_PERMISSION_FAILED",
    "Failed to update Discord campaign channel permissions.",
  );
}

async function ensureCampaignChannel(campaign: DiscordCampaign, roleId: string) {
  const categoryId = getDiscordCampaignCategoryId();
  const channelName = getDiscordCampaignChannelName(campaign);
  const overwrites = channelPermissionOverwrites(roleId);

  if (campaign.discordChannelId) {
    await Promise.all(
      overwrites.map((overwrite) =>
        putChannelPermissionOverwrite(campaign.discordChannelId!, overwrite),
      ),
    );
    return { channelId: campaign.discordChannelId, created: false };
  }

  const channels = await getGuildChannels();
  const categoryExists = channels.some(
    (channel) => channel.id === categoryId && channel.type === DISCORD_CHANNEL_TYPE_CATEGORY,
  );
  if (!categoryExists) {
    throw new DiscordCampaignRoleError(
      "DISCORD_CAMPAIGN_CATEGORY_MISSING",
      "Discord campaign category is not configured.",
      500,
    );
  }

  const existing = channels.find(
    (channel) =>
      channel.type === DISCORD_CHANNEL_TYPE_TEXT &&
      channel.parent_id === categoryId &&
      channel.name.toLowerCase() === channelName.toLowerCase(),
  );
  if (existing) {
    await Promise.all(
      overwrites.map((overwrite) => putChannelPermissionOverwrite(existing.id, overwrite)),
    );
    return { channelId: existing.id, created: false };
  }

  const response = await discordFetch(`/guilds/${getDiscordGuildId()}/channels`, {
    method: "POST",
    body: JSON.stringify({
      name: channelName,
      type: DISCORD_CHANNEL_TYPE_TEXT,
      parent_id: categoryId,
      permission_overwrites: overwrites,
    }),
  });
  await assertDiscordOk(
    response,
    "DISCORD_CHANNEL_CREATE_FAILED",
    `Failed to create Discord channel "${channelName}".`,
  );

  const channel = (await response.json()) as DiscordChannel;
  return { channelId: channel.id, created: true };
}

export async function ensureDiscordCampaignResources(campaign: DiscordCampaign) {
  const role = await ensureCampaignRole(campaign);
  const channel = await ensureCampaignChannel(campaign, role.roleId);

  return {
    roleId: role.roleId,
    channelId: channel.channelId,
    roleCreated: role.created,
    channelCreated: channel.created,
  };
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
  const roleId = getDiscordCampaignRoleId(campaign) ?? (await ensureDiscordCampaignResources(campaign)).roleId;

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
