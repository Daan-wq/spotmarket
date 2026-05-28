import { describe, expect, it } from "vitest";
import { allocateCampaignBudget } from "./campaign-budget-cap";

describe("allocateCampaignBudget", () => {
  it("caps the crossing submission at the remaining campaign budget", () => {
    const result = allocateCampaignBudget({
      totalBudget: 100,
      creatorCpv: 0.01,
      submissions: [
        submission({ id: "first", eligibleViews: 8000, reviewedAt: "2026-05-20T10:00:00.000Z" }),
        submission({ id: "second", eligibleViews: 5000, reviewedAt: "2026-05-20T11:00:00.000Z" }),
        submission({ id: "third", eligibleViews: 1000, reviewedAt: "2026-05-20T12:00:00.000Z" }),
      ],
    });

    expect(result.totalAllocated).toBe(100);
    expect(result.allocations).toEqual([
      expect.objectContaining({ id: "first", earnedAmount: 80, uncappedEarnedAmount: 80 }),
      expect.objectContaining({ id: "second", earnedAmount: 20, uncappedEarnedAmount: 50 }),
      expect.objectContaining({ id: "third", earnedAmount: 0, uncappedEarnedAmount: 10 }),
    ]);
  });

  it("uses approval order instead of input order", () => {
    const result = allocateCampaignBudget({
      totalBudget: 50,
      creatorCpv: 0.01,
      submissions: [
        submission({ id: "late", eligibleViews: 5000, reviewedAt: "2026-05-20T12:00:00.000Z" }),
        submission({ id: "early", eligibleViews: 5000, reviewedAt: "2026-05-20T10:00:00.000Z" }),
      ],
    });

    expect(result.allocations.map((allocation) => allocation.id)).toEqual(["early", "late"]);
    expect(result.allocations).toEqual([
      expect.objectContaining({ id: "early", earnedAmount: 50 }),
      expect.objectContaining({ id: "late", earnedAmount: 0 }),
    ]);
  });

  it("keeps locked submissions fixed and spends later budget around them", () => {
    const result = allocateCampaignBudget({
      totalBudget: 100,
      creatorCpv: 0.01,
      submissions: [
        submission({
          id: "locked",
          earnedAmount: 70,
          eligibleViews: 10_000,
          reviewedAt: "2026-05-20T10:00:00.000Z",
          payoutRunItems: [{ id: "item_1" }],
        }),
        submission({ id: "open", eligibleViews: 10_000, reviewedAt: "2026-05-20T11:00:00.000Z" }),
      ],
    });

    expect(result.totalAllocated).toBe(100);
    expect(result.allocations).toEqual([
      expect.objectContaining({ id: "locked", earnedAmount: 70, locked: true }),
      expect.objectContaining({ id: "open", earnedAmount: 30, uncappedEarnedAmount: 100 }),
    ]);
  });
});

function submission(overrides: {
  id: string;
  eligibleViews?: number;
  earnedAmount?: number;
  reviewedAt?: string;
  payoutRunItems?: Array<{ id: string }>;
}) {
  return {
    createdAt: "2026-05-20T09:00:00.000Z",
    earnedAmount: 0,
    eligibleViews: 0,
    payoutRunItems: [],
    ...overrides,
  };
}
