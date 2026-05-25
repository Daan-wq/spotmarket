import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureDiscordCampaignResources,
  getDiscordCampaignChannelName,
  getDiscordCampaignRoleName,
} from "./discord-campaign-roles";

const originalEnv = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DISCORD_CAMPAIGN_CATEGORY_ID: process.env.DISCORD_CAMPAIGN_CATEGORY_ID,
  DISCORD_CAMPAIGN_MODERATOR_ROLE_IDS: process.env.DISCORD_CAMPAIGN_MODERATOR_ROLE_IDS,
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("Discord campaign resources", () => {
  beforeEach(() => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = "guild-1";
    process.env.DISCORD_CAMPAIGN_CATEGORY_ID = "category-1";
    process.env.DISCORD_CAMPAIGN_MODERATOR_ROLE_IDS = "moderator-role-1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key as keyof typeof originalEnv];
      } else {
        process.env[key as keyof typeof originalEnv] = value;
      }
    }
  });

  it("formats campaign roles and chats in the Discord naming style", () => {
    expect(getDiscordCampaignRoleName({ id: "campaign-1", name: "Buurtvader" })).toBe(
      "Buurtvader Campagne",
    );
    expect(getDiscordCampaignChannelName({ id: "campaign-1", name: "Buurtvader" })).toBe(
      "💬│buurtvader-chat",
    );
    expect(
      getDiscordCampaignChannelName({ id: "campaign-2", name: "Bram's Fruit Clipping" }),
    ).toBe("💬│bramsfruit-chat");
    expect(getDiscordCampaignRoleName({ id: "campaign-2", name: "Bram's Fruit Clipping" })).toBe(
      "Bram's Fruit Campagne",
    );
  });

  it("creates a role and private campaign channel when none exist yet", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/guilds/guild-1/roles") && !init?.method) {
        return jsonResponse([]);
      }
      if (url.endsWith("/guilds/guild-1/roles") && init?.method === "POST") {
        return jsonResponse({ id: "role-1", name: "Buurtvader Campagne" }, { status: 201 });
      }
      if (url.endsWith("/guilds/guild-1/channels") && !init?.method) {
        return jsonResponse([{ id: "category-1", name: "Campagnes", type: 4 }]);
      }
      if (url.endsWith("/guilds/guild-1/channels") && init?.method === "POST") {
        return jsonResponse({ id: "channel-1", name: "💬│buurtvader-chat", type: 0 }, { status: 201 });
      }

      throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      ensureDiscordCampaignResources({ id: "campaign-1", name: "Buurtvader" }),
    ).resolves.toEqual({
      roleId: "role-1",
      channelId: "channel-1",
      roleCreated: true,
      channelCreated: true,
    });

    const roleCreateBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(roleCreateBody).toMatchObject({
      name: "Buurtvader Campagne",
      permissions: "0",
      mentionable: false,
    });

    const channelCreateBody = JSON.parse(fetchMock.mock.calls[3]![1]!.body as string);
    expect(channelCreateBody).toMatchObject({
      name: "💬│buurtvader-chat",
      type: 0,
      parent_id: "category-1",
    });
    expect(channelCreateBody.permission_overwrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "guild-1", deny: "1024" }),
        expect.objectContaining({ id: "moderator-role-1", allow: "117760" }),
        expect.objectContaining({ id: "role-1", allow: "117760" }),
      ]),
    );
  });
});
