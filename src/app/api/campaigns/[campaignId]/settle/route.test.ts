import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  transaction: vi.fn(),
  campaignFindUnique: vi.fn(),
  walletUpsert: vi.fn(),
  submissionUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: routeMocks.transaction,
    campaign: { findUnique: routeMocks.campaignFindUnique },
    wallet: { upsert: routeMocks.walletUpsert },
    campaignSubmission: { update: routeMocks.submissionUpdate },
  },
}));

const params = { params: Promise.resolve({ campaignId: "campaign-1" }) };

describe("POST /api/campaigns/[campaignId]/settle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-user-1" });
  });

  it("returns gone without touching wallets or submissions", async () => {
    const response = await POST(
      new Request("https://app.test/api/campaigns/campaign-1/settle", { method: "POST" }),
      params,
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Legacy campaign settlement is disabled. Use manual creator payout requests.",
    });
    expect(routeMocks.transaction).not.toHaveBeenCalled();
    expect(routeMocks.campaignFindUnique).not.toHaveBeenCalled();
    expect(routeMocks.walletUpsert).not.toHaveBeenCalled();
    expect(routeMocks.submissionUpdate).not.toHaveBeenCalled();
  });
});
