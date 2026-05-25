import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  reconcileReferralPayoutForSubmission,
  reconcileReferralPayoutsForCampaign,
} from "./referral-reconciliation";

const tx = {
  campaignSubmission: { findMany: vi.fn(), findUnique: vi.fn() },
  referralPayout: {
    aggregate: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: { update: vi.fn() },
  notification: { create: vi.fn() },
};

function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission-1",
    status: "APPROVED",
    creatorId: "creator-user-1",
    applicationId: "application-1",
    earnedAmount: 100,
    settledAt: null,
    campaign: { name: "ClipProfit" },
    creator: {
      referredBy: "referrer-user-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    payoutRunItems: [],
    submissionSignals: [],
    ...overrides,
  };
}

describe("reconcileReferralPayoutForSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.campaignSubmission.findMany.mockResolvedValue([]);
    tx.campaignSubmission.findUnique.mockResolvedValue(submission());
    tx.referralPayout.findFirst.mockResolvedValue(null);
    tx.referralPayout.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    tx.referralPayout.create.mockResolvedValue({ id: "referral-payout-1" });
    tx.referralPayout.update.mockResolvedValue({ id: "referral-payout-1" });
    tx.referralPayout.deleteMany.mockResolvedValue({ count: 1 });
    tx.user.update.mockResolvedValue({});
    tx.notification.create.mockResolvedValue({});
  });

  it("creates earned commission for an approved fraud-cleared submission", async () => {
    const result = await reconcileReferralPayoutForSubmission(tx as never, "submission-1");

    expect(result).toEqual({ action: "created", amount: 10, status: "pending" });
    expect(tx.referralPayout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrerId: "referrer-user-1",
        referredUserId: "creator-user-1",
        submissionId: "submission-1",
        amount: 10,
        status: "pending",
      }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "referrer-user-1" },
      data: { referralEarnings: { increment: 10 } },
    });
  });

  it("keeps blocked commission pending review without filling earned totals", async () => {
    tx.campaignSubmission.findUnique.mockResolvedValueOnce(
      submission({
        submissionSignals: [{ severity: "WARN", resolvedAt: null }],
      }),
    );

    const result = await reconcileReferralPayoutForSubmission(tx as never, "submission-1");

    expect(result).toEqual({ action: "created", amount: 10, status: "pending_review" });
    expect(tx.referralPayout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 10, status: "pending_review" }),
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("lowers earned totals when views drop before payout lock", async () => {
    tx.campaignSubmission.findUnique.mockResolvedValueOnce(submission({ earnedAmount: 60 }));
    tx.referralPayout.findFirst.mockResolvedValueOnce({
      id: "referral-payout-1",
      amount: 10,
      status: "pending",
      referrerId: "referrer-user-1",
    });

    const result = await reconcileReferralPayoutForSubmission(tx as never, "submission-1");

    expect(result).toEqual({ action: "updated", amount: 6, status: "pending" });
    expect(tx.referralPayout.update).toHaveBeenCalledWith({
      where: { id: "referral-payout-1" },
      data: expect.objectContaining({ amount: 6, status: "pending" }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "referrer-user-1" },
      data: { referralEarnings: { decrement: 4 } },
    });
  });

  it("removes reversible commission when a submission is rejected", async () => {
    tx.campaignSubmission.findUnique.mockResolvedValueOnce(
      submission({ status: "REJECTED", earnedAmount: 0 }),
    );
    tx.referralPayout.findFirst.mockResolvedValueOnce({
      id: "referral-payout-1",
      amount: 10,
      status: "pending",
      referrerId: "referrer-user-1",
    });

    const result = await reconcileReferralPayoutForSubmission(tx as never, "submission-1");

    expect(result).toEqual({ action: "removed", amount: 0, status: null });
    expect(tx.referralPayout.deleteMany).toHaveBeenCalledWith({
      where: { id: "referral-payout-1", status: { in: ["pending", "pending_review"] } },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "referrer-user-1" },
      data: { referralEarnings: { decrement: 10 } },
    });
  });

  it("reconciles every submission in a campaign for backfill", async () => {
    tx.campaignSubmission.findMany.mockResolvedValueOnce([
      { id: "submission-1" },
      { id: "submission-2" },
    ]);
    tx.campaignSubmission.findUnique
      .mockResolvedValueOnce(submission({ id: "submission-1", earnedAmount: 100 }))
      .mockResolvedValueOnce(
        submission({
          id: "submission-2",
          earnedAmount: 40,
          submissionSignals: [{ severity: "WARN", resolvedAt: null }],
        }),
      );

    const result = await reconcileReferralPayoutsForCampaign(tx as never, "campaign-1");

    expect(result).toEqual({
      campaignId: "campaign-1",
      submissionsChecked: 2,
      created: 2,
      updated: 0,
      removed: 0,
      unchanged: 0,
      locked: 0,
      skipped: 0,
      earnedCommission: 10,
      pendingReviewCommission: 4,
    });
    expect(tx.campaignSubmission.findMany).toHaveBeenCalledWith({
      where: { campaignId: "campaign-1" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
  });
});
