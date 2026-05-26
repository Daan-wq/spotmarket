import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  listDiscordChannels: vi.fn(),
  sendDiscordMessage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/admin/discord", () => ({
  DiscordApiError: class DiscordApiError extends Error {
    status = 500;
  },
  listDiscordChannels: mocks.listDiscordChannels,
  flattenDiscordChannels: (groups: Array<{ channels: unknown[] }>) => groups.flatMap((group) => group.channels),
  discordMessageUrl: (channelId: string, messageId: string) =>
    `https://discord.com/channels/guild-1/${channelId}/${messageId}`,
  sendDiscordMessage: mocks.sendDiscordMessage,
  normalizeDiscordEmbeds: vi.fn((embeds) => embeds ?? []),
  validateDiscordMessageInput: vi.fn(({ content, files, buttons, embeds }) => {
    if (content.length > 2000) return "Message content must be 2000 characters or fewer.";
    if (!content.trim() && files.length === 0 && buttons.length === 0 && embeds.length === 0) {
      return "Add message content, an embed, a file, or a URL button.";
    }
    return null;
  }),
}));

describe("POST /api/admin/discord/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "supabase-admin-1" });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "admin-db-1", email: "admin@test.com" });
    mocks.listDiscordChannels.mockResolvedValue([
      {
        id: "cat-1",
        name: "Public",
        position: 0,
        channels: [{ id: "channel-1", name: "announcements", type: 0, parentId: "cat-1", position: 0 }],
      },
    ]);
    mocks.sendDiscordMessage.mockResolvedValue({ id: "message-1", channelId: "channel-1" });
  });

  it("rejects invalid message content before calling Discord", async () => {
    const formData = new FormData();
    formData.append("channelId", "channel-1");
    formData.append("content", "x".repeat(2001));

    const response = await POST(new Request("https://app.test/api/admin/discord/messages", { method: "POST", body: formData }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Message content must be 2000 characters or fewer." });
    expect(mocks.sendDiscordMessage).not.toHaveBeenCalled();
  });

  it("sends to a live channel and writes an audit log", async () => {
    const formData = new FormData();
    formData.append("channelId", "channel-1");
    formData.append("content", "Hello Discord");
    formData.append("templateId", "template-1");
    formData.append("buttons", JSON.stringify([{ label: "Open", url: "https://clipprofit.com" }]));
    formData.append("files", new File(["image"], "image.png", { type: "image/png" }));

    const response = await POST(new Request("https://app.test/api/admin/discord/messages", { method: "POST", body: formData }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: {
        id: "message-1",
        channelId: "channel-1",
        url: "https://discord.com/channels/guild-1/channel-1/message-1",
      },
    });
    expect(mocks.sendDiscordMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      content: "Hello Discord",
      embeds: [],
      buttons: [{ label: "Open", url: "https://clipprofit.com" }],
      files: [expect.any(File)],
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-db-1",
        action: "discord.message.send",
        entityType: "DiscordMessage",
        entityId: "message-1",
      }),
    });
  });

  it("accepts URL-button-only messages", async () => {
    const formData = new FormData();
    formData.append("channelId", "channel-1");
    formData.append("content", "");
    formData.append("buttons", JSON.stringify([{ label: "Join campaign", url: "https://clipprofit.com/campaigns/1" }]));

    const response = await POST(new Request("https://app.test/api/admin/discord/messages", { method: "POST", body: formData }));

    expect(response.status).toBe(200);
    expect(mocks.sendDiscordMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      content: "",
      embeds: [],
      buttons: [{ label: "Join campaign", url: "https://clipprofit.com/campaigns/1" }],
      files: [],
    });
  });

  it("accepts embed-only messages", async () => {
    const formData = new FormData();
    formData.append("channelId", "channel-1");
    formData.append("content", "");
    formData.append("embeds", JSON.stringify([{ title: "Rules", description: "Respect each other.", color: 0x5865f2 }]));

    const response = await POST(new Request("https://app.test/api/admin/discord/messages", { method: "POST", body: formData }));

    expect(response.status).toBe(200);
    expect(mocks.sendDiscordMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      content: "",
      embeds: [expect.objectContaining({ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] })],
      buttons: [],
      files: [],
    });
  });

  it("passes uploaded embed images through as Discord files", async () => {
    const formData = new FormData();
    formData.append("channelId", "channel-1");
    formData.append("content", "");
    formData.append("embeds", JSON.stringify([{ title: "Launch", imageUrl: "attachment://embed-1-image-launch.png" }]));
    formData.append("files", new File(["image"], "launch.png", { type: "image/png" }), "embed-1-image-launch.png");

    const response = await POST(new Request("https://app.test/api/admin/discord/messages", { method: "POST", body: formData }));

    expect(response.status).toBe(200);
    expect(mocks.sendDiscordMessage).toHaveBeenCalledWith({
      channelId: "channel-1",
      content: "",
      embeds: [expect.objectContaining({ title: "Launch", imageUrl: "attachment://embed-1-image-launch.png", fields: [] })],
      buttons: [],
      files: [expect.objectContaining({ name: "embed-1-image-launch.png", type: "image/png" })],
    });
  });
});
