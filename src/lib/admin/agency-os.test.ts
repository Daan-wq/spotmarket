import { describe, expect, it } from "vitest";
import {
  buildOperatingAreas,
  calculateAgencyOsMetrics,
  calculateApprovalRate,
  getAgencyOsDateWindows,
  type AgencyCampaignMetricInput,
  type AgencyPayoutMetricInput,
  type AgencySubmissionMetricInput,
} from "./agency-os";

const now = new Date(2026, 4, 3, 12, 0, 0);

function campaign(overrides: Partial<AgencyCampaignMetricInput>): AgencyCampaignMetricInput {
  return {
    status: "active",
    totalBudget: 0,
    createdAt: new Date(2026, 4, 1),
    deadline: new Date(2026, 4, 20),
    ...overrides,
  };
}

function submission(overrides: Partial<AgencySubmissionMetricInput>): AgencySubmissionMetricInput {
  return {
    status: "PENDING",
    createdAt: new Date(2026, 4, 2),
    reviewedAt: null,
    earnedAmount: 0,
    ...overrides,
  };
}

function payout(overrides: Partial<AgencyPayoutMetricInput>): AgencyPayoutMetricInput {
  return {
    status: "pending",
    amount: 0,
    ...overrides,
  };
}

describe("getAgencyOsDateWindows", () => {
  it("creates the expected dashboard windows", () => {
    const windows = getAgencyOsDateWindows(now);

    expect(windows.todayStart.getFullYear()).toBe(2026);
    expect(windows.todayStart.getMonth()).toBe(4);
    expect(windows.todayStart.getDate()).toBe(3);
    expect(windows.todayStart.getHours()).toBe(0);
    expect(windows.weekStart.getDate()).toBe(26);
    expect(windows.monthStart.getDate()).toBe(1);
    expect(windows.nextMonthStart.getMonth()).toBe(5);
    expect(windows.followingMonthStart.getMonth()).toBe(6);
  });
});

describe("calculateApprovalRate", () => {
  it("returns null when no clips were reviewed", () => {
    expect(calculateApprovalRate(0, 0)).toBeNull();
  });

  it("calculates approved share across reviewed clips", () => {
    expect(calculateApprovalRate(8, 2)).toBe(80);
  });
});

describe("calculateAgencyOsMetrics", () => {
  it("derives pipeline, payout, approval, and profit metrics", () => {
    const metrics = calculateAgencyOsMetrics({
      now,
      campaigns: [
        campaign({ status: "active", totalBudget: 1000, createdAt: new Date(2026, 4, 2), deadline: new Date(2026, 5, 10) }),
        campaign({ status: "draft", totalBudget: 500, createdAt: new Date(2026, 3, 20), deadline: new Date(2026, 4, 20) }),
        campaign({ status: "pending_payment", totalBudget: "1500", createdAt: new Date(2026, 4, 1), deadline: new Date(2026, 5, 5) }),
        campaign({ status: "cancelled", totalBudget: 999, createdAt: new Date(2026, 4, 1), deadline: new Date(2026, 5, 4) }),
        campaign({ status: "completed", totalBudget: 700, createdAt: new Date(2026, 2, 1), deadline: new Date(2026, 6, 1) }),
      ],
      submissions: [
        submission({ status: "APPROVED", createdAt: new Date(2026, 4, 2), reviewedAt: new Date(2026, 4, 2), earnedAmount: 100 }),
        submission({ status: "APPROVED", createdAt: new Date(2026, 3, 20), reviewedAt: new Date(2026, 4, 1), earnedAmount: 40 }),
        submission({ status: "REJECTED", createdAt: new Date(2026, 4, 2), reviewedAt: new Date(2026, 4, 2), earnedAmount: 0 }),
        submission({ status: "FLAGGED", createdAt: new Date(2026, 3, 20), reviewedAt: new Date(2026, 4, 1), earnedAmount: 0 }),
        submission({ status: "PENDING", createdAt: new Date(2026, 4, 2), reviewedAt: null, earnedAmount: 0 }),
        submission({ status: "APPROVED", createdAt: new Date(2026, 3, 10), reviewedAt: new Date(2026, 3, 12), earnedAmount: 20 }),
      ],
      payouts: [
        payout({ status: "confirmed", amount: 20 }),
        payout({ status: "pending", amount: 30 }),
        payout({ status: "sent", amount: "10" }),
        payout({ status: "failed", amount: 5 }),
      ],
      verifiedConnectionCreatorIds: ["creator-a", "creator-b", "creator-a", null],
      activeApplicationCreatorIds: ["creator-b", "creator-c", null],
      openRiskSignals: 4,
      criticalRiskSignals: 1,
      tokenBrokenSignals: 2,
    });

    expect(metrics.totalRevenueThisMonth).toBe(2500);
    expect(metrics.expectedRevenueNextMonth).toBe(2500);
    expect(metrics.bookedCampaignBudget).toBe(3700);
    expect(metrics.activeBrands).toBe(1);
    expect(metrics.pipelineBrands).toBe(2);
    expect(metrics.activeClippers).toBe(3);
    expect(metrics.clipsDeliveredThisWeek).toBe(3);
    expect(metrics.clipsApprovedThisWeek).toBe(2);
    expect(metrics.clipsRejectedOrRevisedThisWeek).toBe(2);
    expect(metrics.clipsNeedsReview).toBe(1);
    expect(metrics.approvalRate).toBe(50);
    expect(metrics.payoutsOwed).toBe(45);
    expect(metrics.creatorEarnings).toBe(160);
    expect(metrics.estimatedGrossProfit).toBe(3495);
    expect(metrics.openRiskSignals).toBe(4);
    expect(metrics.criticalRiskSignals).toBe(1);
    expect(metrics.tokenBrokenSignals).toBe(2);
  });
});

describe("buildOperatingAreas", () => {
  it("marks the implemented OS modules live and leaves pricing/contracts manual", () => {
    const areas = buildOperatingAreas();
    const byName = new Map(areas.map((area) => [area.name, area]));

    expect(areas).toHaveLength(12);
    expect(areas.filter((area) => area.status === "live")).toHaveLength(10);
    expect(byName.get("CEO Dashboard")?.status).toBe("live");
    expect(byName.get("Quality Control")?.status).toBe("live");
    expect(byName.get("Brand CRM")?.status).toBe("live");
    expect(byName.get("Brand Onboarding")?.status).toBe("live");
    expect(byName.get("Contracts")?.status).toBe("manual");
    expect(byName.get("SOP Library")?.status).toBe("live");
  });
});
