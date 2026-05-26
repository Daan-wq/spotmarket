import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  campaignFindUnique: vi.fn(),
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
      findUnique: routeMocks.campaignFindUnique,
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

const params = { params: Promise.resolve({ campaignId: "campaign-1" }) };

const campaign = {
  id: "campaign-1",
  name: "Launch",
  status: "draft",
  discordRoleId: null,
  discordChannelId: null,
  discordAnnouncementChannelId: null,
  discordAnnouncementMessageId: null,
  discordAnnouncementSentAt: null,
};

describe("POST /api/admin/campaigns/[campaignId]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1", role: "admin" });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1" });
    routeMocks.campaignFindUnique.mockResolvedValue(campaign);
    routeMocks.ensureDiscordCampaignProvisioning.mockResolvedValue({
      campaign: { ...campaign, discordRoleId: "role-1", discordChannelId: "channel-1" },
      resources: { roleId: "role-1", channelId: "channel-1", roleCreated: false, channelCreated: false },
    });
    routeMocks.campaignUpdate.mockResolvedValue({
      ...campaign,
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

  it("activates the campaign, posts the Discord announcement once, and returns both results", async () => {
    const response = await POST(new Request("https://app.test/api/admin/campaigns/campaign-1/publish"), params);

    expect(response.status).toBe(200);
    expect(routeMocks.requireAuth).toHaveBeenCalledWith("admin");
    expect(routeMocks.campaignUpdate).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: { status: "active" },
    });
    expect(routeMocks.sendCampaignAnnouncementOnce).toHaveBeenCalledWith({
      campaign: expect.objectContaining({ id: "campaign-1", status: "active" }),
      userId: "admin-user-1",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      discordAnnouncement: {
        status: "sent",
        channelId: "campaign-channel-1",
        messageId: "message-1",
      },
      discordProvisioning: { roleId: "role-1", channelId: "channel-1", roleCreated: false, channelCreated: false },
    });
  });

  it("skips Discord send when the campaign was already announced", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce({
      ...campaign,
      status: "active",
      discordAnnouncementMessageId: "message-existing",
    });
    routeMocks.ensureDiscordCampaignProvisioning.mockResolvedValueOnce({
      campaign: { ...campaign, status: "active", discordAnnouncementMessageId: "message-existing" },
      resources: { roleId: "role-1", channelId: "channel-1", roleCreated: false, channelCreated: false },
    });
    routeMocks.sendCampaignAnnouncementOnce.mockResolvedValueOnce({
      status: "skipped",
      reason: "already_sent",
      messageId: "message-existing",
    });

    const response = await POST(new Request("https://app.test/api/admin/campaigns/campaign-1/publish"), params);

    expect(response.status).toBe(200);
    expect(routeMocks.campaignUpdate).not.toHaveBeenCalled();
    expect(routeMocks.sendCampaignAnnouncementOnce).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        discordAnnouncement: { status: "skipped", reason: "already_sent", messageId: "message-existing" },
      }),
    );
  });
});
