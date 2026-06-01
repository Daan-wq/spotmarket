import { describe, expect, it } from "vitest";
import {
  calculateCampaignDelivery,
  calculateDerivedGoalViews,
  submissionLiveViews,
} from "./campaign-delivery";

describe("campaign delivery metrics", () => {
  it("calculates target views from budget and CPM", () => {
    expect(calculateDerivedGoalViews({
      totalBudget: 500,
      creatorCpv: 0.00018,
      goalViews: 1_000_000,
    })).toBe(2_777_777);
  });

  it("uses legacy goal views only when CPM cannot calculate a target", () => {
    const delivery = calculateCampaignDelivery({
      campaign: { totalBudget: 500, creatorCpv: 0, goalViews: 1_250_000 },
      submissions: [],
    });

    expect(delivery.targetViews).toBe(1_250_000);
    expect(delivery.targetViewsSource).toBe("legacy_goal");
  });

  it("uses live approved views before capped eligible views", () => {
    const delivery = calculateCampaignDelivery({
      campaign: { totalBudget: 500, creatorCpv: 0.00025 },
      submissions: [
        {
          status: "APPROVED",
          eligibleViews: 200_000,
          viewCount: 650_000,
          metricSnapshots: [
            { capturedAt: new Date("2026-05-01T00:00:00.000Z"), viewCount: 600_000 },
            { capturedAt: new Date("2026-05-02T00:00:00.000Z"), viewCount: 725_000 },
          ],
        },
        {
          status: "REJECTED",
          eligibleViews: 100_000,
          viewCount: 900_000,
        },
      ],
    });

    expect(delivery.targetViews).toBe(2_000_000);
    expect(delivery.currentViews).toBe(725_000);
    expect(delivery.paidEligibleViews).toBe(200_000);
    expect(delivery.deliveryProgress).toBe(0.3625);
  });

  it("calculates overdelivery above target views", () => {
    const delivery = calculateCampaignDelivery({
      campaign: { totalBudget: 500, creatorCpv: 0.00025 },
      submissions: [
        { status: "APPROVED", viewCount: 2_400_000, eligibleViews: 2_000_000 },
      ],
    });

    expect(delivery.targetViews).toBe(2_000_000);
    expect(delivery.currentViews).toBe(2_400_000);
    expect(delivery.overdeliveryViews).toBe(400_000);
    expect(delivery.overdeliveryPercent).toBe(0.2);
  });
});

describe("submissionLiveViews", () => {
  it("falls back from snapshot to view count, claimed views, then eligible views", () => {
    expect(submissionLiveViews({ viewCount: 10, claimedViews: 8, eligibleViews: 5 })).toBe(10);
    expect(submissionLiveViews({ claimedViews: 8, eligibleViews: 5 })).toBe(8);
    expect(submissionLiveViews({ eligibleViews: 5 })).toBe(5);
  });
});
