import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listDiscordChannels,
  listDiscordEmojis,
  sendDiscordMessage,
  validateDiscordMessageInput,
} from "./discord";

const originalEnv = { ...process.env };

describe("admin Discord helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = "guild-1";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fetches text and announcement channels grouped by category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "cat-1", type: 4, name: "Announcements", position: 1 },
          { id: "text-1", type: 0, name: "general", parent_id: "cat-1", position: 2 },
          { id: "news-1", type: 5, name: "updates", parent_id: "cat-1", position: 1 },
          { id: "voice-1", type: 2, name: "voice", parent_id: "cat-1", position: 3 },
        ],
      }),
    );

    const result = await listDiscordChannels();

    expect(result).toEqual([
      {
        id: "cat-1",
        name: "Announcements",
        position: 1,
        channels: [
          { id: "news-1", name: "updates", type: 5, parentId: "cat-1", position: 1 },
          { id: "text-1", name: "general", type: 0, parentId: "cat-1", position: 2 },
        ],
      },
    ]);
  });

  it("maps live guild emojis into insertable syntax", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "123", name: "clipprofit", animated: false, available: true },
          { id: "456", name: "rocket", animated: true, available: false },
        ],
      }),
    );

    const result = await listDiscordEmojis();

    expect(result).toEqual([
      {
        id: "123",
        name: "clipprofit",
        animated: false,
        available: true,
        url: "https://cdn.discordapp.com/emojis/123.png",
        syntax: "<:clipprofit:123>",
      },
      {
        id: "456",
        name: "rocket",
        animated: true,
        available: false,
        url: "https://cdn.discordapp.com/emojis/456.gif",
        syntax: "<a:rocket:456>",
      },
    ]);
  });

  it("validates Discord message limits before sending", () => {
    expect(
      validateDiscordMessageInput({
        channelId: "1",
        content: "x".repeat(2001),
        files: [],
      }),
    ).toEqual("Message content must be 2000 characters or fewer.");

    expect(
      validateDiscordMessageInput({
        channelId: "1",
        content: "",
        files: Array.from({ length: 11 }, (_, i) => new File(["x"], `file-${i}.txt`)),
      }),
    ).toEqual("Discord accepts up to 10 files per message.");
  });

  it("sends multipart messages with payload_json and files", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-1", channel_id: "channel-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDiscordMessage({
      channelId: "channel-1",
      content: "Hello",
      files: [new File(["image"], "image.png", { type: "image/png" })],
    });

    expect(result).toEqual({ id: "msg-1", channelId: "channel-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/v10/channels/channel-1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
        body: expect.any(FormData),
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bot bot-token");
  });

  it("sends URL buttons as Discord message components", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-1", channel_id: "channel-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendDiscordMessage({
      channelId: "channel-1",
      content: "Hello",
      files: [],
      buttons: [{ label: "Open campaign", url: "https://clipprofit.com/campaigns/1" }],
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String((init.body as FormData).get("payload_json")));
    expect(payload.components).toEqual([
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Open campaign",
            url: "https://clipprofit.com/campaigns/1",
          },
        ],
      },
    ]);
  });

  it("sends cleaned Discord embeds in payload_json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-1", channel_id: "channel-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendDiscordMessage({
      channelId: "channel-1",
      content: "",
      files: [],
      embeds: [
        {
          title: "Rules",
          description: "Respect each other.",
          color: 0x5865f2,
          authorName: "",
          imageUrl: "",
          fields: [{ name: "Rule 1", value: "Be kind", inline: false }],
        },
      ],
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String((init.body as FormData).get("payload_json")));
    expect(payload.embeds).toEqual([
      {
        title: "Rules",
        description: "Respect each other.",
        color: 0x5865f2,
        fields: [{ name: "Rule 1", value: "Be kind", inline: false }],
      },
    ]);
  });

  it("sends uploaded embed images as attachment references", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-1", channel_id: "channel-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendDiscordMessage({
      channelId: "channel-1",
      content: "",
      files: [new File(["image"], "embed-1-image-launch.png", { type: "image/png" })],
      embeds: [
        {
          title: "Launch",
          imageUrl: "attachment://embed-1-image-launch.png",
        },
      ],
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String((init.body as FormData).get("payload_json")));
    expect(payload.embeds).toEqual([
      {
        title: "Launch",
        image: { url: "attachment://embed-1-image-launch.png" },
      },
    ]);
    expect(payload.attachments).toEqual([{ id: 0, filename: "embed-1-image-launch.png" }]);
  });
});
