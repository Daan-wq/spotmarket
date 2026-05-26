import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  campaignCreate: vi.fn(),
  campaignUpdate: vi.fn(),
  ensureDiscordCampaignProvisioning: vi.fn(),
  sendCampaignAnnouncementOnce: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    campaign: {
      create: routeMocks.campaignCreate,
      update: routeMocks.campaignUpdate,
    },
  },
}));

vi.mock("@/lib/discord-campaign-provisioning", () => ({
  ensureDiscordCampaignProvisioning: routeMocks.ensureDiscordCampaignProvisioning,
}));

vi.mock("@/lib/admin/discord-campaign-announcements", () => ({
  sendCampaignAnnouncementOnce: routeMocks.sendCampaignAnnouncementOnce,
}));

const draftCampaign = {
  id: "campaign-1",
  name: "Launch",
  status: "draft",
  discordRoleId: null,
  discordChannelId: null,
  discordAnnouncementChannelId: null,
  discordAnnouncementMessageId: null,
  discordAnnouncementSentAt: null,
};

function launchRequest() {
  return new Request("https://app.test/api/campaigns/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Launch campaign",
      totalBudget: 1000,
      creatorCpv: 0.00025,
      deadline: "2026-06-01T00:00:00.000Z",
      platforms: ["INSTAGRAM"],
    }),
  });
}

describe("POST /api/campaigns/launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1", role: "admin" });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1" });
    routeMocks.campaignCreate.mockResolvedValue(draftCampaign);
    routeMocks.ensureDiscordCampaignProvisioning.mockResolvedValue({
      campaign: { ...draftCampaign, discordRoleId: "role-1", discordChannelId: "channel-1" },
      resources: { roleId: "role-1", channelId: "channel-1", roleCreated: true, channelCreated: true },
    });
    routeMocks.campaignUpdate.mockResolvedValue({
      ...draftCampaign,
      status: "active",
      discordRoleId: "role-1",
      discordChannelId: "channel-1",
    });
    routeMocks.sendCampaignAnnouncementOnce.mockResolvedValue({
      status: "sent",
      channelId: "campaign-channel-1",
      messageId: "message-1",
    });
  });

  it("posts the campaign announcement after launch activates the campaign", async () => {
    const response = await POST(launchRequest() as never);

    expect(response.status).toBe(201);
    expect(routeMocks.campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "draft" }),
      }),
    );
    expect(routeMocks.campaignUpdate).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: { status: "active" },
    });
    expect(routeMocks.sendCampaignAnnouncementOnce).toHaveBeenCalledWith({
      campaign: expect.objectContaining({ id: "campaign-1", status: "active" }),
      userId: "admin-user-1",
    });
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        discordAnnouncement: {
          status: "sent",
          channelId: "campaign-channel-1",
          messageId: "message-1",
        },
      }),
    );
  });
});
