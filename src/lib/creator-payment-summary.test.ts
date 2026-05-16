import { describe, expect, it } from "vitest";
import { buildCreatorPaymentSummary } from "./creator-payment-summary";

function submission(
  overrides: Partial<Parameters<typeof buildCreatorPaymentSummary>[0]["submissions"][number]>,
) {
  return {
    campaignId: "campaign_1",
    campaignName: "ClipProfit",
    earnedAmount: 9.9,
    eligibleViews: 9900,
    viewCount: 3,
    claimedViews: 0,
    ...overrides,
  };
}

function payout(
  overrides: Partial<Parameters<typeof buildCreatorPaymentSummary>[0]["payouts"][number]>,
) {
  return {
    amount: 0,
    status: "pending",
    ...overrides,
  };
}

describe("buildCreatorPaymentSummary", () => {
  it("uses approved stored earnings as creator-facing financial truth", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({ earnedAmount: 9.9 }),
        submission({ earnedAmount: "9.90" }),
      ],
      payouts: [],
    });

    expect(summary.totalEarned).toBe(19.8);
    expect(summary.availableBalance).toBe(19.8);
  });

  it("does not recalculate approved earnings from campaign CPV changes", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({
          earnedAmount: 9.9,
          eligibleViews: 9900,
          creatorCpv: 0.0001,
        }),
      ],
      payouts: [],
    });

    expect(summary.totalEarned).toBe(9.9);
    expect(summary.earningsByCampaign[0]?.totalEarned).toBe(9.9);
  });

  it("subtracts sent, confirmed, pending, and processing payouts from available balance", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [submission({ earnedAmount: 100 })],
      payouts: [
        payout({ amount: 20, status: "sent" }),
        payout({ amount: 10, status: "confirmed" }),
        payout({ amount: 5, status: "pending" }),
        payout({ amount: 15, status: "processing" }),
        payout({ amount: 7, status: "failed" }),
      ],
    });

    expect(summary.totalPaid).toBe(30);
    expect(summary.pendingPayout).toBe(20);
    expect(summary.availableBalance).toBe(50);
  });

  it("prefers eligible views, then verified views, then claimed views for campaign rows", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({ campaignId: "a", campaignName: "A", eligibleViews: 20, viewCount: 10, claimedViews: 5 }),
        submission({ campaignId: "a", campaignName: "A", eligibleViews: null, viewCount: 10, claimedViews: 5 }),
        submission({ campaignId: "a", campaignName: "A", eligibleViews: null, viewCount: null, claimedViews: 5 }),
      ],
      payouts: [],
    });

    expect(summary.earningsByCampaign[0]?.totalViews).toBe(35);
  });
});
