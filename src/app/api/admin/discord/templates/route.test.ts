import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    discordMessageTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

describe("/api/admin/discord/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ userId: "supabase-admin-1" });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "admin-db-1" });
    mocks.prisma.discordMessageTemplate.findFirst.mockResolvedValue(null);
  });

  it("lists templates with optional search filters", async () => {
    mocks.prisma.discordMessageTemplate.findMany.mockResolvedValue([
      {
        id: "tpl-1",
        name: "Launch",
        kind: "TEMPLATE",
        messageMode: "CONTENT_EMBED",
        channelId: "channel-1",
        content: "Hello",
        embeds: [{ title: "Rules", description: "Respect each other.", color: 0x5865f2 }],
        buttons: [{ label: "Open", url: "https://clipprofit.com" }],
        tags: ["launch"],
        updatedAt: new Date("2026-05-26T00:00:00Z"),
      },
    ]);

    const response = await GET(new Request("https://app.test/api/admin/discord/templates?kind=TEMPLATE&q=launch&tag=launch"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templates[0].id).toBe("tpl-1");
    expect(mocks.prisma.discordMessageTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          kind: "TEMPLATE",
          tags: { has: "launch" },
        }),
      }),
    );
  });

  it("creates templates and records an audit event", async () => {
    mocks.prisma.discordMessageTemplate.create.mockResolvedValue({
      id: "tpl-1",
      name: "Launch",
      kind: "TEMPLATE",
      messageMode: "CONTENT_EMBED",
      channelId: "channel-1",
      content: "**Hello**",
      embeds: [{ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] }],
      buttons: [{ label: "Open", url: "https://clipprofit.com" }],
      tags: ["launch"],
    });

    const response = await POST(
      new Request("https://app.test/api/admin/discord/templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Launch",
          kind: "TEMPLATE",
          messageMode: "CONTENT_EMBED",
          channelId: "channel-1",
          content: "**Hello**",
          embeds: [{ title: "Rules", description: "Respect each other.", color: 0x5865f2 }],
          buttons: [{ label: "Open", url: "https://clipprofit.com" }],
          tags: ["launch"],
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      template: {
        id: "tpl-1",
        name: "Launch",
        kind: "TEMPLATE",
        messageMode: "CONTENT_EMBED",
        channelId: "channel-1",
        content: "**Hello**",
        embeds: [expect.objectContaining({ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] })],
        buttons: [{ label: "Open", url: "https://clipprofit.com" }],
        tags: ["launch"],
      },
    });
    expect(mocks.prisma.discordMessageTemplate.create).toHaveBeenCalledWith({
      data: {
        name: "Launch",
        kind: "TEMPLATE",
        messageMode: "CONTENT_EMBED",
        channelId: "channel-1",
        content: "**Hello**",
        embeds: [expect.objectContaining({ title: "Rules", description: "Respect each other.", color: 0x5865f2, fields: [] })],
        buttons: [{ label: "Open", url: "https://clipprofit.com" }],
        tags: ["launch"],
        createdByUserId: "admin-db-1",
        updatedByUserId: "admin-db-1",
      },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-db-1",
        action: "discord.template.create",
        entityId: "tpl-1",
      }),
    });
  });

  it("updates an existing template when saving the same name and kind", async () => {
    mocks.prisma.discordMessageTemplate.findFirst.mockResolvedValue({
      id: "tpl-existing",
      name: "Launch",
      kind: "TEMPLATE",
      updatedAt: new Date("2026-05-26T00:00:00Z"),
    });
    mocks.prisma.discordMessageTemplate.update.mockResolvedValue({
      id: "tpl-existing",
      name: "Launch",
      kind: "TEMPLATE",
      messageMode: "CONTENT",
      channelId: null,
      content: "Updated",
      embeds: [],
      buttons: [],
      tags: ["launch"],
    });

    const response = await POST(
      new Request("https://app.test/api/admin/discord/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Launch", kind: "TEMPLATE", content: "Updated", tags: ["launch"] }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      template: {
        id: "tpl-existing",
        name: "Launch",
        kind: "TEMPLATE",
        messageMode: "CONTENT",
        channelId: null,
        content: "Updated",
        embeds: [],
        buttons: [],
        tags: ["launch"],
      },
    });
    expect(mocks.prisma.discordMessageTemplate.create).not.toHaveBeenCalled();
    expect(mocks.prisma.discordMessageTemplate.update).toHaveBeenCalledWith({
      where: { id: "tpl-existing" },
      data: {
        name: "Launch",
        kind: "TEMPLATE",
        messageMode: "CONTENT",
        channelId: null,
        content: "Updated",
        embeds: [],
        buttons: [],
        tags: ["launch"],
        updatedByUserId: "admin-db-1",
      },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-db-1",
        action: "discord.template.update",
        entityId: "tpl-existing",
      }),
    });
  });
});
