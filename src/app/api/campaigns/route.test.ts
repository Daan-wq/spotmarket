import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userFindUnique: vi.fn(),
  campaignCreate: vi.fn(),
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
    campaign: { create: routeMocks.campaignCreate },
  },
}));

vi.mock("@/lib/admin/discord-campaign-announcements", () => ({
  sendCampaignAnnouncementOnce: routeMocks.sendCampaignAnnouncementOnce,
}));

function createRequest() {
  return new Request("https://app.test/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Draft campaign",
      platforms: ["INSTAGRAM"],
      totalBudget: 1000,
      deadline: "2026-06-01T00:00:00.000Z",
      minimumPaidViews: 3000,
      maximumPaidViews: 150000,
      adminMarginPerK: 0,
    }),
  });
}

describe("POST /api/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({ data: { user: { id: "admin-supabase-1" } } });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1", role: "admin" });
    routeMocks.campaignCreate.mockResolvedValue({
      id: "campaign-1",
      name: "Draft campaign",
      status: "draft",
      goalViews: null,
    });
  });

  it("creates drafts without posting a Discord campaign announcement", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(201);
    expect(routeMocks.campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: "active" }),
      }),
    );
    expect(routeMocks.sendCampaignAnnouncementOnce).not.toHaveBeenCalled();
  });
});
