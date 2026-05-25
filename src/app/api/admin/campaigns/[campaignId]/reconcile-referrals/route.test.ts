import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  campaignFindUnique: vi.fn(),
  transaction: vi.fn(),
  reconcileReferralPayoutsForCampaign: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: routeMocks.campaignFindUnique },
    $transaction: routeMocks.transaction,
  },
}));

vi.mock("@/lib/referral-reconciliation", () => ({
  reconcileReferralPayoutsForCampaign: routeMocks.reconcileReferralPayoutsForCampaign,
}));

describe("POST /api/admin/campaigns/[campaignId]/reconcile-referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      name: "ClipProfit",
    });
    routeMocks.transaction.mockImplementation((callback) =>
      callback({ tx: true }),
    );
    routeMocks.reconcileReferralPayoutsForCampaign.mockResolvedValue({
      campaignId: "campaign-1",
      submissionsChecked: 68,
      created: 2,
      updated: 4,
      removed: 1,
      unchanged: 60,
      locked: 1,
      skipped: 0,
      earnedCommission: 12.34,
      pendingReviewCommission: 1.5,
    });
  });

  it("runs campaign referral reconciliation in a transaction", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/campaigns/campaign-1/reconcile-referrals", {
        method: "POST",
      }),
      { params: Promise.resolve({ campaignId: "campaign-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      campaign: { id: "campaign-1", name: "ClipProfit" },
      campaignId: "campaign-1",
      submissionsChecked: 68,
      created: 2,
      updated: 4,
      removed: 1,
      unchanged: 60,
      locked: 1,
      skipped: 0,
      earnedCommission: 12.34,
      pendingReviewCommission: 1.5,
    });
    expect(routeMocks.reconcileReferralPayoutsForCampaign).toHaveBeenCalledWith(
      { tx: true },
      "campaign-1",
    );
  });

  it("returns 404 when the campaign does not exist", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/admin/campaigns/missing/reconcile-referrals", {
        method: "POST",
      }),
      { params: Promise.resolve({ campaignId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Campaign not found" });
    expect(routeMocks.reconcileReferralPayoutsForCampaign).not.toHaveBeenCalled();
  });
});
