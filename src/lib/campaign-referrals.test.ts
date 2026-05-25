import { describe, expect, it } from "vitest";
import {
  buildCampaignReferralPath,
  calculateCampaignReferralReport,
  normalizeCampaignSlug,
} from "./campaign-referrals";

describe("campaign referral helpers", () => {
  it("normalizes campaign slugs and builds clean referral paths", () => {
    expect(normalizeCampaignSlug(" ClipProfit ")).toBe("clipprofit");
    expect(normalizeCampaignSlug("bad/slug")).toBeUndefined();
    expect(buildCampaignReferralPath("clipprofit", "qubgzdf-")).toBe(
      "/c/clipprofit/QUBGZDF-",
    );
  });

  it("keeps invite count and active clipper count separate", () => {
    const report = calculateCampaignReferralReport({
      totalBudget: 450,
      attributions: [
        {
          referrerId: "referrer-1",
          referrerLabel: "Alice",
          referredUserId: "user-1",
          onboardedAt: new Date("2026-05-01T00:00:00.000Z"),
          firstSubmissionAt: new Date("2026-05-02T00:00:00.000Z"),
          activeAt: new Date("2026-05-03T00:00:00.000Z"),
          earnedAmount: 100,
        },
        {
          referrerId: "referrer-1",
          referrerLabel: "Alice",
          referredUserId: "user-2",
          onboardedAt: new Date("2026-05-01T00:00:00.000Z"),
          firstSubmissionAt: null,
          activeAt: null,
          earnedAmount: 0,
        },
        {
          referrerId: "referrer-2",
          referrerLabel: "Bob",
          referredUserId: null,
          onboardedAt: null,
          firstSubmissionAt: null,
          activeAt: null,
          earnedAmount: 0,
        },
      ],
    });

    expect(report.totalClicks).toBe(3);
    expect(report.inviteCount).toBe(2);
    expect(report.activeClipperCount).toBe(1);
    expect(report.firstSubmissions).toBe(1);
    expect(report.cpaPerInvite).toBe(225);
    expect(report.cpaPerActiveClipper).toBe(450);
    expect(report.referrers[0]).toMatchObject({
      referrerId: "referrer-1",
      clicks: 2,
      inviteCount: 2,
      activeClipperCount: 1,
      totalEarnedByInvitedClippers: 100,
    });
  });
});
