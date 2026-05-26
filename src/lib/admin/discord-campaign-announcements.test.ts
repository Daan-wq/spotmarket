import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCampaignAnnouncementContent,
  sendCampaignAnnouncementOnce,
} from "./discord-campaign-announcements";

const mocks = vi.hoisted(() => ({
  prisma: {
    campaign: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  sendDiscordMessage: vi.fn(),
  discordMessageUrl: vi.fn((channelId: string, messageId: string) =>
    `https://discord.com/channels/guild-1/${channelId}/${messageId}`,
  ),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/admin/discord", () => ({
  discordMessageUrl: mocks.discordMessageUrl,
  sendDiscordMessage: mocks.sendDiscordMessage,
}));

const baseCampaign = {
  id: "campaign-1",
  name: "Buurtvader Vlogs & CairoCash livestreams",
  platforms: ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS", "FACEBOOK"],
  contentType: "Clipping",
  description: "Maak clips van Buurtvader zijn vlogs en CairoCash zijn livestreams!",
  requirements: "Gebruik alle vlogs vanaf de nieuwste vlog\nBuurtvader gaat elke dag live op Kick",
  contentGuidelines: "Een watermark is verplicht in elke video",
  requiredHashtags: ["#Buurtvader", "#CairoCash"],
  referralLink: "https://kick.com/cairocash/videos",
  briefAssetUrl: "https://drive.google.com/file/d/brief/view",
  guidelinesUrl: "https://drive.google.com/file/d/rules/view",
  contentAssetUrls: ["https://drive.google.com/file/d/watermark/view"],
  creatorCpv: 0.00025,
  minimumPaidViews: 3000,
  maximumPaidViews: 150000,
  discordAnnouncementChannelId: null,
  discordAnnouncementMessageId: null,
  discordAnnouncementSentAt: null,
};

describe("Discord campaign announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_CAMPAIGN_CHANNEL_ID = "campaign-channel-1";
    mocks.sendDiscordMessage.mockResolvedValue({ id: "message-1", channelId: "campaign-channel-1" });
    mocks.prisma.campaign.update.mockResolvedValue({
      ...baseCampaign,
      discordAnnouncementChannelId: "campaign-channel-1",
      discordAnnouncementMessageId: "message-1",
      discordAnnouncementSentAt: new Date("2026-05-26T12:00:00Z"),
    });
  });

  it("renders a campaign as the fixed Discord Markdown template", () => {
    const content = buildCampaignAnnouncementContent(baseCampaign);

    expect(content).toContain("NIEUWE CAMPAGNE");
    expect(content).toContain("Buurtvader Vlogs & CairoCash livestreams");
    expect(content).toContain("Platform: Instagram, TikTok, YouTube Shorts & Facebook");
    expect(content).toContain("CPM: €0,25 / 1k views");
    expect(content).toContain("Minimum views: 3.000");
    expect(content).toContain("Maximum views: 150.000");
    expect(content).toContain("https://kick.com/cairocash/videos");
    expect(content).toContain("Gebruik alle vlogs vanaf de nieuwste vlog");
    expect(content).toContain("#Buurtvader en #CairoCash");
  });

  it("does nothing when the campaign already has a Discord announcement message", async () => {
    const result = await sendCampaignAnnouncementOnce({
      campaign: { ...baseCampaign, discordAnnouncementMessageId: "message-existing" },
      userId: "admin-1",
    });

    expect(result).toEqual({ status: "skipped", reason: "already_sent", messageId: "message-existing" });
    expect(mocks.sendDiscordMessage).not.toHaveBeenCalled();
    expect(mocks.prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("sends once, stores the Discord message id, and writes success audit metadata", async () => {
    const result = await sendCampaignAnnouncementOnce({ campaign: baseCampaign, userId: "admin-1" });

    expect(result).toEqual({
      status: "sent",
      channelId: "campaign-channel-1",
      messageId: "message-1",
      url: "https://discord.com/channels/guild-1/campaign-channel-1/message-1",
    });
    expect(mocks.sendDiscordMessage).toHaveBeenCalledWith({
      channelId: "campaign-channel-1",
      content: expect.stringContaining("NIEUWE CAMPAGNE"),
      files: [],
    });
    expect(mocks.prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: expect.objectContaining({
        discordAnnouncementChannelId: "campaign-channel-1",
        discordAnnouncementMessageId: "message-1",
        discordAnnouncementSentAt: expect.any(Date),
      }),
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "discord.campaign_announcement.sent",
        entityType: "Campaign",
        entityId: "campaign-1",
      }),
    });
  });

  it("audits Discord failures without leaking bot tokens", async () => {
    mocks.sendDiscordMessage.mockRejectedValueOnce(new Error("Discord HTTP 403 missing permissions"));

    await expect(sendCampaignAnnouncementOnce({ campaign: baseCampaign, userId: "admin-1" })).rejects.toThrow(
      "Discord HTTP 403 missing permissions",
    );

    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "discord.campaign_announcement.failed",
        metadata: expect.objectContaining({
          channelId: "campaign-channel-1",
          error: "Discord HTTP 403 missing permissions",
        }),
      }),
    });
    expect(JSON.stringify(mocks.prisma.auditLog.create.mock.calls)).not.toContain("Bot ");
  });
});
