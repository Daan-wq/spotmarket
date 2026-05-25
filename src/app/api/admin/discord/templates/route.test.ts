import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    discordMessageTemplate: {
      findMany: vi.fn(),
      create: vi.fn(),
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
  });

  it("lists templates with optional search filters", async () => {
    mocks.prisma.discordMessageTemplate.findMany.mockResolvedValue([
      { id: "tpl-1", name: "Launch", kind: "TEMPLATE", content: "Hello", tags: ["launch"], updatedAt: new Date("2026-05-26T00:00:00Z") },
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
      content: "**Hello**",
      tags: ["launch"],
    });

    const response = await POST(
      new Request("https://app.test/api/admin/discord/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Launch", kind: "TEMPLATE", content: "**Hello**", tags: ["launch"] }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      template: {
        id: "tpl-1",
        name: "Launch",
        kind: "TEMPLATE",
        content: "**Hello**",
        tags: ["launch"],
      },
    });
    expect(mocks.prisma.discordMessageTemplate.create).toHaveBeenCalledWith({
      data: {
        name: "Launch",
        kind: "TEMPLATE",
        content: "**Hello**",
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
});
