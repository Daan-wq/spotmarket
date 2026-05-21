import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  campaignSubmissionFindUnique: vi.fn(),
  transaction: vi.fn(),
  txUserFindUnique: vi.fn(),
  txUserUpdate: vi.fn(),
  txReferralPayoutFindFirst: vi.fn(),
  txReferralPayoutAggregate: vi.fn(),
  txReferralPayoutCreate: vi.fn(),
  txCampaignSubmissionUpdate: vi.fn(),
  txCampaignApplicationUpdate: vi.fn(),
  txNotificationCreate: vi.fn(),
  calculateReferralSplit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignSubmission: { findUnique: routeMocks.campaignSubmissionFindUnique },
    $transaction: routeMocks.transaction,
  },
}));

vi.mock("@/lib/referral", () => ({
  calculateReferralSplit: routeMocks.calculateReferralSplit,
}));

type ReviewTransaction = {
  user: {
    findUnique: typeof routeMocks.txUserFindUnique;
    update: typeof routeMocks.txUserUpdate;
  };
  referralPayout: {
    findFirst: typeof routeMocks.txReferralPayoutFindFirst;
    aggregate: typeof routeMocks.txReferralPayoutAggregate;
    create: typeof routeMocks.txReferralPayoutCreate;
  };
  campaignSubmission: {
    update: typeof routeMocks.txCampaignSubmissionUpdate;
  };
  campaignApplication: {
    update: typeof routeMocks.txCampaignApplicationUpdate;
  };
  notification: {
    create: typeof routeMocks.txNotificationCreate;
  };
};

function postReview(body: unknown) {
  return POST(
    new Request("http://localhost/api/submissions/submission-1/review", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as Parameters<typeof POST>[0],
    { params: Promise.resolve({ id: "submission-1" }) },
  );
}

describe("POST /api/submissions/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-1" });
    routeMocks.txUserFindUnique.mockResolvedValue({ referredBy: null, createdAt: new Date("2026-05-01T00:00:00.000Z") });
    routeMocks.txCampaignSubmissionUpdate.mockResolvedValue({ id: "submission-1", status: "APPROVED" });
    routeMocks.txCampaignApplicationUpdate.mockResolvedValue({ id: "application-1" });
    routeMocks.txNotificationCreate.mockResolvedValue({ id: "notification-1" });
    routeMocks.transaction.mockImplementation(async (callback: (tx: ReviewTransaction) => Promise<unknown>) =>
      callback({
        user: {
          findUnique: routeMocks.txUserFindUnique,
          update: routeMocks.txUserUpdate,
        },
        referralPayout: {
          findFirst: routeMocks.txReferralPayoutFindFirst,
          aggregate: routeMocks.txReferralPayoutAggregate,
          create: routeMocks.txReferralPayoutCreate,
        },
        campaignSubmission: {
          update: routeMocks.txCampaignSubmissionUpdate,
        },
        campaignApplication: {
          update: routeMocks.txCampaignApplicationUpdate,
        },
        notification: {
          create: routeMocks.txNotificationCreate,
        },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("approves using stored API-refreshed views when no manual views are submitted", async () => {
    routeMocks.campaignSubmissionFindUnique.mockResolvedValue({
      id: "submission-1",
      creatorId: "creator-1",
      applicationId: "application-1",
      application: { id: "application-1" },
      campaign: { id: "campaign-1", name: "Campaign", creatorCpv: 1 },
      status: "PENDING",
      earnedAmount: 0,
      viewCount: 1500,
      baselineViews: 200,
      claimedViews: 50,
    });

    const response = await postReview({ status: "APPROVED" });

    expect(response.status).toBe(200);
    expect(routeMocks.txCampaignSubmissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "submission-1" },
        data: expect.objectContaining({
          status: "APPROVED",
          baselineViews: 200,
          viewCount: 1500,
          eligibleViews: 1300,
          earnedAmount: 1300,
        }),
      }),
    );
  });

  it("requires a note before rejecting", async () => {
    const response = await postReview({ status: "REJECTED" });

    expect(response.status).toBe(400);
    expect(routeMocks.campaignSubmissionFindUnique).not.toHaveBeenCalled();
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });
});
