import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => {
  const tx = {
    campaignSubmission: { findMany: vi.fn() },
    payoutRun: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    requireAuth: vi.fn(),
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    campaignSubmissionFindMany: vi.fn(),
    payoutRunCreate: vi.fn(),
    auditLogCreate: vi.fn(),
    reconcileCampaignBudgetCap: vi.fn(),
    reconcileReferralPayoutForSubmission: vi.fn(),
    tx,
  };
});

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: routeMocks.transaction,
    campaignSubmission: { findMany: routeMocks.campaignSubmissionFindMany },
    payoutRun: { create: routeMocks.payoutRunCreate },
    auditLog: { create: routeMocks.auditLogCreate },
  },
}));

vi.mock("@/lib/referral-reconciliation", () => ({
  reconcileReferralPayoutForSubmission: routeMocks.reconcileReferralPayoutForSubmission,
}));

vi.mock("@/lib/campaign-budget-cap", () => ({
  reconcileCampaignBudgetCap: routeMocks.reconcileCampaignBudgetCap,
}));

function postRun() {
  return POST(
    new Request("http://localhost/api/admin/payout-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodStart: "2026-05-01T00:00:00.000Z",
        periodEnd: "2026-05-31T23:59:59.999Z",
      }),
    }),
  );
}

function approvedSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission-1",
    status: "APPROVED",
    earnedAmount: 50,
    settledAt: null,
    payoutRunItems: [],
    submissionSignals: [],
    productionAssignment: null,
    creator: {
      creatorProfile: {
        id: "creator-profile-1",
        operationalProfile: { ratePerClip: 0 },
      },
    },
    ...overrides,
  };
}

describe("POST /api/admin/payout-runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-user-1" });
    routeMocks.reconcileCampaignBudgetCap.mockResolvedValue({
      totalBudget: 100,
      totalAllocated: 0,
      allocations: [],
      changedSubmissionIds: [],
    });
    routeMocks.reconcileReferralPayoutForSubmission.mockResolvedValue({
      action: "unchanged",
      amount: 0,
      status: null,
    });
    routeMocks.tx.campaignSubmission.findMany.mockResolvedValue([]);
    routeMocks.tx.payoutRun.create.mockResolvedValue({
      id: "run-1",
      items: [{ id: "item-1" }],
    });
    routeMocks.tx.auditLog.create.mockResolvedValue({});
    routeMocks.campaignSubmissionFindMany.mockResolvedValue([]);
    routeMocks.payoutRunCreate.mockResolvedValue({
      id: "run-1",
      items: [{ id: "item-1" }],
    });
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("returns gone without creating payout-run records", async () => {
    routeMocks.tx.campaignSubmission.findMany
      .mockResolvedValueOnce([{ campaignId: "campaign-1" }])
      .mockResolvedValueOnce([
        approvedSubmission({ id: "clear-submission", earnedAmount: 50 }),
        approvedSubmission({
          id: "blocked-submission",
          earnedAmount: 80,
          submissionSignals: [{ severity: "WARN", resolvedAt: null }],
        }),
        approvedSubmission({ id: "zero-submission", earnedAmount: 0 }),
      ]);

    const response = await postRun();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Payout runs are disabled. Use manual creator payout requests.",
    });
    expect(routeMocks.transaction).not.toHaveBeenCalled();
    expect(routeMocks.tx.payoutRun.create).not.toHaveBeenCalled();
    expect(routeMocks.reconcileReferralPayoutForSubmission).not.toHaveBeenCalled();
    expect(routeMocks.reconcileCampaignBudgetCap).not.toHaveBeenCalled();
  });
});
