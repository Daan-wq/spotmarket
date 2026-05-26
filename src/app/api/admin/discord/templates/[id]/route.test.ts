import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    discordMessageTemplate: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

describe("/api/admin/discord/templates/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "supabase-admin-1" });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "admin-db-1" });
  });

  it("updates a template and tracks the updater", async () => {
    mocks.prisma.discordMessageTemplate.update.mockResolvedValue({
      id: "tpl-1",
      name: "Launch v2",
      kind: "TEMPLATE",
      messageMode: "CONTENT_EMBED",
      channelId: "channel-1",
      content: "Updated",
      embeds: [{ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] }],
      buttons: [{ label: "Open", url: "https://clipprofit.com" }],
      tags: [],
    });

    const response = await PATCH(
      new Request("https://app.test/api/admin/discord/templates/tpl-1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Launch v2",
          messageMode: "CONTENT_EMBED",
          channelId: "channel-1",
          content: "Updated",
          embeds: [{ title: "Rules", description: "Respect each other.", color: 0x5865f2 }],
          buttons: [{ label: "Open", url: "https://clipprofit.com" }],
        }),
      }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      template: {
        id: "tpl-1",
        name: "Launch v2",
        kind: "TEMPLATE",
        messageMode: "CONTENT_EMBED",
        channelId: "channel-1",
        content: "Updated",
        embeds: [expect.objectContaining({ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] })],
        buttons: [{ label: "Open", url: "https://clipprofit.com" }],
        tags: [],
      },
    });
    expect(mocks.prisma.discordMessageTemplate.update).toHaveBeenCalledWith({
      where: { id: "tpl-1" },
      data: {
        name: "Launch v2",
        messageMode: "CONTENT_EMBED",
        channelId: "channel-1",
        content: "Updated",
        embeds: [expect.objectContaining({ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] })],
        buttons: [{ label: "Open", url: "https://clipprofit.com" }],
        updatedByUserId: "admin-db-1",
      },
    });
  });

  it("deletes a template and writes an audit event", async () => {
    mocks.prisma.discordMessageTemplate.delete.mockResolvedValue({ id: "tpl-1" });

    const response = await DELETE(
      new Request("https://app.test/api/admin/discord/templates/tpl-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "tpl-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.prisma.discordMessageTemplate.delete).toHaveBeenCalledWith({ where: { id: "tpl-1" } });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-db-1",
        action: "discord.template.delete",
        entityId: "tpl-1",
      }),
    });
  });
});
