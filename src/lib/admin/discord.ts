import { validateDiscordMessageInput } from "./discord-message-validation";

export const DISCORD_API_BASE = "https://discord.com/api/v10";
export const DISCORD_CDN_BASE = "https://cdn.discordapp.com";

export {
  DISCORD_MAX_FILES,
  DISCORD_MAX_REQUEST_BYTES,
  DISCORD_MESSAGE_MAX_CHARS,
  getDiscordMessageValidationIssues,
  validateDiscordMessageInput,
} from "./discord-message-validation";

const CHANNEL_TYPE_TEXT = 0;
const CHANNEL_TYPE_CATEGORY = 4;
const CHANNEL_TYPE_ANNOUNCEMENT = 5;
const SENDABLE_CHANNEL_TYPES = new Set([CHANNEL_TYPE_TEXT, CHANNEL_TYPE_ANNOUNCEMENT]);

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
}

export interface DiscordChannelGroup {
  id: string | null;
  name: string;
  position: number;
  channels: DiscordChannel[];
}

export interface DiscordEmoji {
  id: string;
  name: string;
  animated: boolean;
  available: boolean;
  url: string;
  syntax: string;
}

export interface DiscordSentMessage {
  id: string;
  channelId: string;
}

export interface DiscordMessageInput {
  channelId: string;
  content: string;
  files: File[];
}

interface RawDiscordChannel {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  parent_id?: unknown;
  position?: unknown;
}

interface RawDiscordEmoji {
  id?: unknown;
  name?: unknown;
  animated?: unknown;
  available?: unknown;
}

export class DiscordApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
}

export function getDiscordGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId) throw new DiscordApiError("DISCORD_GUILD_ID is not configured");
  return guildId;
}

function getDiscordBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) throw new DiscordApiError("DISCORD_BOT_TOKEN is not configured");
  return token;
}

async function discordFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getDiscordBotToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bot ${token}`);
  return fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers,
  });
}

export async function listDiscordChannels(): Promise<DiscordChannelGroup[]> {
  const guildId = getDiscordGuildId();
  const response = await discordFetch(`/guilds/${guildId}/channels`);
  if (!response.ok) {
    throw new DiscordApiError(await discordErrorMessage(response, "Could not fetch Discord channels"), response.status);
  }

  const raw = (await response.json()) as RawDiscordChannel[];
  const categories = new Map<string, { id: string; name: string; position: number }>();
  const channels: DiscordChannel[] = [];

  for (const item of raw) {
    const id = typeof item.id === "string" ? item.id : null;
    const name = typeof item.name === "string" ? item.name : null;
    const type = typeof item.type === "number" ? item.type : null;
    if (!id || !name || type == null) continue;

    const position = typeof item.position === "number" ? item.position : 0;
    const parentId = typeof item.parent_id === "string" ? item.parent_id : null;

    if (type === CHANNEL_TYPE_CATEGORY) {
      categories.set(id, { id, name, position });
      continue;
    }

    if (SENDABLE_CHANNEL_TYPES.has(type)) {
      channels.push({ id, name, type, parentId, position });
    }
  }

  const grouped = new Map<string, DiscordChannelGroup>();
  for (const channel of channels.sort(comparePositionThenName)) {
    const category = channel.parentId ? categories.get(channel.parentId) : null;
    const key = category?.id ?? "uncategorized";
    const group = grouped.get(key) ?? {
      id: category?.id ?? null,
      name: category?.name ?? "Uncategorized",
      position: category?.position ?? Number.MAX_SAFE_INTEGER,
      channels: [],
    };
    group.channels.push(channel);
    grouped.set(key, group);
  }

  return [...grouped.values()].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export async function listDiscordEmojis(): Promise<DiscordEmoji[]> {
  const guildId = getDiscordGuildId();
  const response = await discordFetch(`/guilds/${guildId}/emojis`);
  if (!response.ok) {
    throw new DiscordApiError(await discordErrorMessage(response, "Could not fetch Discord emojis"), response.status);
  }

  const raw = (await response.json()) as RawDiscordEmoji[];
  return raw
    .map((emoji): DiscordEmoji | null => {
      if (typeof emoji.id !== "string" || typeof emoji.name !== "string") return null;
      const animated = emoji.animated === true;
      const extension = animated ? "gif" : "png";
      return {
        id: emoji.id,
        name: emoji.name,
        animated,
        available: emoji.available !== false,
        url: `${DISCORD_CDN_BASE}/emojis/${emoji.id}.${extension}`,
        syntax: animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`,
      };
    })
    .filter((emoji): emoji is DiscordEmoji => emoji !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function sendDiscordMessage(input: DiscordMessageInput): Promise<DiscordSentMessage> {
  const validationError = validateDiscordMessageInput(input);
  if (validationError) throw new DiscordApiError(validationError, 400);

  const body = new FormData();
  body.append(
    "payload_json",
    JSON.stringify({
      content: input.content,
      attachments: input.files.map((file, index) => ({
        id: index,
        filename: file.name,
      })),
    }),
  );

  input.files.forEach((file, index) => {
    body.append(`files[${index}]`, file, file.name);
  });

  const response = await discordFetch(`/channels/${input.channelId}/messages`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new DiscordApiError(await discordErrorMessage(response, "Could not send Discord message"), response.status);
  }

  const sent = (await response.json()) as { id?: unknown; channel_id?: unknown };
  if (typeof sent.id !== "string" || typeof sent.channel_id !== "string") {
    throw new DiscordApiError("Discord returned an invalid message response");
  }
  return { id: sent.id, channelId: sent.channel_id };
}

export function discordMessageUrl(channelId: string, messageId: string): string {
  return `https://discord.com/channels/${getDiscordGuildId()}/${channelId}/${messageId}`;
}

export function flattenDiscordChannels(groups: DiscordChannelGroup[]): DiscordChannel[] {
  return groups.flatMap((group) => group.channels);
}

async function discordErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return `${fallback}.`;
  return `${fallback}: Discord HTTP ${response.status} ${text.slice(0, 500)}`;
}

function comparePositionThenName(a: DiscordChannel, b: DiscordChannel): number {
  return a.position - b.position || a.name.localeCompare(b.name);
}
