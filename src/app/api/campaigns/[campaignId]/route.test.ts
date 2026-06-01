import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

const routeMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userFindUnique: vi.fn(),
  campaignFindUnique: vi.fn(),
  campaignUpdate: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationCount: vi.fn(),
  applicationDeleteMany: vi.fn(),
  submissionCount: vi.fn(),
  campaignDelete: vi.fn(),
  ensureDiscordCampaignResources: vi.fn(),
  removeDiscordCampaignRole: vi.fn(),
  sendCampaignAnnouncementOnce: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: routeMocks.getUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    campaign: {
      findUnique: routeMocks.campaignFindUnique,
      update: routeMocks.campaignUpdate,
      delete: routeMocks.campaignDelete,
    },
    campaignApplication: {
      findMany: routeMocks.applicationFindMany,
      count: routeMocks.applicationCount,
      deleteMany: routeMocks.applicationDeleteMany,
    },
    campaignSubmission: { count: routeMocks.submissionCount },
  },
}));

vi.mock("@/lib/discord-campaign-roles", () => ({
  ensureDiscordCampaignResources: routeMocks.ensureDiscordCampaignResources,
  removeDiscordCampaignRole: routeMocks.removeDiscordCampaignRole,
}));

vi.mock("@/lib/admin/discord-campaign-announcements", () => ({
  sendCampaignAnnouncementOnce: routeMocks.sendCampaignAnnouncementOnce,
}));

const params = { params: Promise.resolve({ campaignId: "campaign-1" }) };

function request(body: unknown) {
  return new Request("https://app.test/api/campaigns/campaign-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function campaign(status = "active") {
  return {
    id: "campaign-1",
    name: "ClipProfit",
    status,
    minimumPaidViews: 0,
    maximumPaidViews: null,
    totalBudget: 1000,
    goalViews: BigInt(100000),
    creatorCpv: 0.01,
    adminMargin: 0.002,
    discordRoleId: null,
    discordChannelId: null,
    discordAnnouncementChannelId: null,
    discordAnnouncementMessageId: null,
    discordAnnouncementSentAt: null,
  };
}

function deleteRequest() {
  return new Request("https://app.test/api/campaigns/campaign-1", {
    method: "DELETE",
  });
}

describe("PATCH /api/campaigns/[campaignId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({ data: { user: { id: "admin-supabase-1" } } });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1", role: "admin" });
    routeMocks.campaignFindUnique.mockResolvedValue(campaign());
    routeMocks.campaignUpdate.mockResolvedValue(campaign("completed"));
    routeMocks.applicationFindMany.mockResolvedValue([
      { creatorProfile: { user: { discordId: "discord-user-1" } } },
      { creatorProfile: { user: { discordId: null } } },
      { creatorProfile: { user: { discordId: "discord-user-2" } } },
    ]);
    routeMocks.applicationCount.mockResolvedValue(0);
    routeMocks.applicationDeleteMany.mockResolvedValue({ count: 0 });
    routeMocks.submissionCount.mockResolvedValue(0);
    routeMocks.campaignDelete.mockResolvedValue(campaign("draft"));
    routeMocks.ensureDiscordCampaignResources.mockResolvedValue({
      roleId: "discord-role-1",
      channelId: "discord-channel-1",
      roleCreated: true,
      channelCreated: true,
    });
    routeMocks.removeDiscordCampaignRole.mockResolvedValue({ skipped: false });
    routeMocks.sendCampaignAnnouncementOnce.mockResolvedValue({
      status: "sent",
      channelId: "campaign-announcements",
      messageId: "discord-message-1",
    });
  });

  it("removes campaign Discord roles when a campaign is completed", async () => {
    const response = await PATCH(request({ status: "completed" }), params);

    expect(response.status).toBe(200);
    expect(routeMocks.applicationFindMany).toHaveBeenCalledWith({
      where: { campaignId: "campaign-1" },
      select: {
        creatorProfile: {
          select: {
            user: { select: { discordId: true } },
          },
        },
      },
    });
    expect(routeMocks.removeDiscordCampaignRole).toHaveBeenCalledTimes(2);
    expect(routeMocks.removeDiscordCampaignRole).toHaveBeenCalledWith(
      expect.objectContaining({ id: "campaign-1", name: "ClipProfit" }),
      "discord-user-1",
    );
    expect(routeMocks.removeDiscordCampaignRole).toHaveBeenCalledWith(
      expect.objectContaining({ id: "campaign-1", name: "ClipProfit" }),
      "discord-user-2",
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "campaign-1",
        status: "completed",
        discordRoleSync: { attempted: 2, failed: 0 },
      }),
    );
  });

  it("keeps campaign Discord roles when a campaign is paused", async () => {
    routeMocks.campaignUpdate.mockResolvedValueOnce(campaign("paused"));

    const response = await PATCH(request({ status: "paused" }), params);

    expect(response.status).toBe(200);
    expect(routeMocks.applicationFindMany).not.toHaveBeenCalled();
    expect(routeMocks.removeDiscordCampaignRole).not.toHaveBeenCalled();
    expect(routeMocks.ensureDiscordCampaignResources).not.toHaveBeenCalled();
    expect(routeMocks.sendCampaignAnnouncementOnce).not.toHaveBeenCalled();
  });

  it("recalculates goal views from budget and CPM when campaign economics change", async () => {
    const response = await PATCH(request({ totalBudget: 500, creatorRatePerK: 0.25 }), params);

    expect(response.status).toBe(200);
    expect(routeMocks.campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalBudget: 500,
          creatorCpv: 0.00025,
          businessCpv: 0.00025,
          adminMargin: 0,
          goalViews: BigInt(2_000_000),
        }),
      }),
    );
  });

  it("provisions Discord resources and posts an announcement when a campaign becomes active", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce(campaign("draft"));
    routeMocks.campaignUpdate.mockResolvedValueOnce({
      ...campaign("active"),
      discordRoleId: "discord-role-1",
      discordChannelId: "discord-channel-1",
    });

    const response = await PATCH(request({ status: "active" }), params);

    expect(response.status).toBe(200);
    expect(routeMocks.ensureDiscordCampaignResources).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "campaign-1",
        name: "ClipProfit",
        discordRoleId: null,
        discordChannelId: null,
      }),
    );
    expect(routeMocks.campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "active",
          discordRoleId: "discord-role-1",
          discordChannelId: "discord-channel-1",
        }),
      }),
    );
    expect(routeMocks.sendCampaignAnnouncementOnce).toHaveBeenCalledWith({
      campaign: expect.objectContaining({
        id: "campaign-1",
        status: "active",
        discordRoleId: "discord-role-1",
        discordChannelId: "discord-channel-1",
      }),
      userId: "admin-user-1",
    });
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        discordProvisioning: {
          roleId: "discord-role-1",
          channelId: "discord-channel-1",
          roleCreated: true,
          channelCreated: true,
        },
        discordAnnouncement: {
          status: "sent",
          channelId: "campaign-announcements",
          messageId: "discord-message-1",
        },
      }),
    );
  });

  it("returns an explicit announcement failure when Discord rejects the send", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce(campaign("draft"));
    routeMocks.campaignUpdate.mockResolvedValueOnce({
      ...campaign("active"),
      discordRoleId: "discord-role-1",
      discordChannelId: "discord-channel-1",
    });
    routeMocks.sendCampaignAnnouncementOnce.mockRejectedValueOnce(new Error("Discord HTTP 403 missing permissions"));

    const response = await PATCH(request({ status: "active" }), params);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Discord HTTP 403 missing permissions",
        discordAnnouncement: {
          status: "failed",
          error: "Discord HTTP 403 missing permissions",
        },
      }),
    );
  });
});

describe("DELETE /api/campaigns/[campaignId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({ data: { user: { id: "admin-supabase-1" } } });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1", role: "admin" });
    routeMocks.campaignFindUnique.mockResolvedValue(campaign("draft"));
    routeMocks.applicationCount.mockResolvedValue(0);
    routeMocks.applicationDeleteMany.mockResolvedValue({ count: 0 });
    routeMocks.submissionCount.mockResolvedValue(0);
    routeMocks.campaignDelete.mockResolvedValue(campaign("draft"));
  });

  it("blocks hard delete when the campaign has submissions to preserve duplicate/audit history", async () => {
    routeMocks.submissionCount.mockResolvedValueOnce(2);

    const response = await DELETE(deleteRequest(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Cannot delete campaign with submissions; archive or cancel it instead.",
    });
    expect(routeMocks.applicationDeleteMany).not.toHaveBeenCalled();
    expect(routeMocks.campaignDelete).not.toHaveBeenCalled();
  });

  it("allows delete only when there are no submissions and no active applications", async () => {
    const response = await DELETE(deleteRequest(), params);

    expect(response.status).toBe(204);
    expect(routeMocks.submissionCount).toHaveBeenCalledWith({ where: { campaignId: "campaign-1" } });
    expect(routeMocks.applicationCount).toHaveBeenCalledWith({
      where: { campaignId: "campaign-1", status: { in: ["approved", "active"] } },
    });
    expect(routeMocks.applicationDeleteMany).toHaveBeenCalledWith({ where: { campaignId: "campaign-1" } });
    expect(routeMocks.campaignDelete).toHaveBeenCalledWith({ where: { id: "campaign-1" } });
  });
});
