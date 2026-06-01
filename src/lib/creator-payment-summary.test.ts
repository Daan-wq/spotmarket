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

  it("includes qualifying approved clips and excludes below-threshold clips with zero stored earnings", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({ earnedAmount: 50, eligibleViews: 5000 }),
        submission({ earnedAmount: 0, eligibleViews: 0, viewCount: 200 }),
      ],
      payouts: [],
    });

    expect(summary.totalEarned).toBe(50);
    expect(summary.availableBalance).toBe(50);
    expect(summary.earningsByCampaign[0]?.totalEarned).toBe(50);
    expect(summary.earningsByCampaign[0]?.totalViews).toBe(5000);
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
    expect(summary.profit).toBe(30);
    expect(summary.pendingPayout).toBe(20);
    expect(summary.availableBalance).toBe(50);
  });

  it("keeps the post total visible while only later earnings delta becomes available after manual payout", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [submission({ earnedAmount: 80, eligibleViews: 200_000 })],
      payouts: [payout({ amount: 40, status: "confirmed" })],
    });

    expect(summary.totalEarned).toBe(80);
    expect(summary.profit).toBe(40);
    expect(summary.availableBalance).toBe(40);
    expect(summary.earningsByCampaign[0]?.totalEarned).toBe(80);
  });

  it("ignores failed payouts so rejected requests return to available balance", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [submission({ earnedAmount: 100 })],
      payouts: [
        payout({ amount: 20, status: "failed" }),
        payout({ amount: 10, status: "disputed" }),
      ],
    });

    expect(summary.profit).toBe(0);
    expect(summary.pendingPayout).toBe(0);
    expect(summary.availableBalance).toBe(100);
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

  it("uses paid view thresholds when falling back from missing stored eligible views", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({
          campaignId: "a",
          campaignName: "A",
          eligibleViews: null,
          viewCount: 7_000,
          baselineViews: 1_000,
          minimumPaidViews: 2_000,
          maximumPaidViews: 5_000,
        }),
      ],
      payouts: [],
    });

    expect(summary.earningsByCampaign[0]?.totalViews).toBe(5_000);
  });

  it("keeps open warning and critical signals out of available balance", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({
          earnedAmount: 40,
          submissionSignals: [{ severity: "WARN", resolvedAt: null }],
        }),
        submission({
          earnedAmount: 25,
          submissionSignals: [{ severity: "INFO", resolvedAt: null }],
        }),
      ],
      payouts: [],
    });

    expect(summary.totalEarned).toBe(65);
    expect(summary.pendingReviewBalance).toBe(40);
    expect(summary.availableBalance).toBe(25);
  });

  it("treats payout-run locked submissions as pending payout instead of withdrawable", () => {
    const summary = buildCreatorPaymentSummary({
      submissions: [
        submission({ earnedAmount: 60, payoutRunItems: [{ id: "item_1", payout: null }] }),
        submission({ earnedAmount: 30 }),
      ],
      payouts: [],
    });

    expect(summary.totalEarned).toBe(90);
    expect(summary.pendingPayout).toBe(60);
    expect(summary.availableBalance).toBe(30);
  });
});
