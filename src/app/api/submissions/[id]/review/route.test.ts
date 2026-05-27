import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => {
  const tx = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    campaign: { findUnique: vi.fn() },
    referralPayout: {
      aggregate: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
    campaignSubmission: { update: vi.fn() },
    campaignReferralAttribution: { updateMany: vi.fn() },
    campaignApplication: { update: vi.fn() },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  type ReviewTransaction = typeof tx;

  return {
    requireAuth: vi.fn(),
    userFindUnique: vi.fn(),
    submissionFindUnique: vi.fn(),
    transaction: vi.fn(async (callback: (client: ReviewTransaction) => unknown) => callback(tx)),
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
    user: { findUnique: routeMocks.userFindUnique },
    campaignSubmission: {
      findUnique: routeMocks.submissionFindUnique,
    },
  },
}));

vi.mock("@/lib/referral-reconciliation", () => ({
  reconcileReferralPayoutForSubmission: routeMocks.reconcileReferralPayoutForSubmission,
}));

const params = { params: Promise.resolve({ id: "submission-1" }) };

function reviewRequest(body: unknown) {
  return new Request("https://app.test/api/submissions/submission-1/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission-1",
    status: "PENDING",
    creatorId: "creator-user-1",
    campaignId: "campaign-1",
    applicationId: "application-1",
    earnedAmount: 0,
    eligibleViews: null,
    viewCount: null,
    baselineViews: null,
    logoStatus: "PRESENT",
    settledAt: null,
    payoutRunItems: [],
    metricSnapshots: [],
    createdAt: new Date("2026-05-20T10:00:00.000Z"),
    campaign: {
      id: "campaign-1",
      name: "Spring Campaign",
      creatorCpv: 0.01,
      minimumPaidViews: 0,
      maximumPaidViews: null,
    },
    application: {
      id: "application-1",
      earnedAmount: 0,
    },
    ...overrides,
  };
}

describe("POST /api/submissions/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1" });
    routeMocks.tx.user.findUnique.mockResolvedValue({
      referredBy: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    routeMocks.tx.referralPayout.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    routeMocks.tx.referralPayout.findFirst.mockResolvedValue(null);
    routeMocks.tx.referralPayout.deleteMany.mockResolvedValue({ count: 0 });
    routeMocks.tx.campaign.findUnique.mockResolvedValue(null);
    routeMocks.tx.campaignSubmission.update.mockResolvedValue({
      id: "submission-1",
      status: "REJECTED",
    });
    routeMocks.reconcileReferralPayoutForSubmission.mockResolvedValue({
      action: "unchanged",
      amount: 0,
      status: null,
    });
  });

  it("requires a rejection reason", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(submission());

    const response = await POST(
      reviewRequest({ status: "REJECTED" }),
      params,
    );

    expect(response.status).toBe(400);
    expect(routeMocks.tx.campaignSubmission.update).not.toHaveBeenCalled();
  });

  it("rejects a pending submission when a reason is supplied", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(submission());

    const response = await POST(
      reviewRequest({
        status: "REJECTED",
        rejectionReason: "INVALID_POST",
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "submission-1" },
        data: expect.objectContaining({
          status: "REJECTED",
          earnedAmount: 0,
          eligibleViews: 0,
          rejectionNote: "Invalid post",
        }),
      }),
    );
    expect(routeMocks.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "submission.reject",
        entityType: "CampaignSubmission",
        entityId: "submission-1",
        userId: "admin-user-1",
        metadata: expect.objectContaining({
          rejectionReason: "INVALID_POST",
          previousStatus: "PENDING",
        }),
      }),
    });
  });

  it("reverses unpaid approved earnings when rejecting an approved submission", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        status: "APPROVED",
        earnedAmount: 42.75,
        eligibleViews: 4275,
        viewCount: 5000,
        baselineViews: 725,
        application: {
          id: "application-1",
          earnedAmount: 100,
        },
      }),
    );
    routeMocks.tx.referralPayout.findFirst.mockResolvedValue({
      id: "referral-payout-1",
      amount: 4.28,
      status: "pending",
      referrerId: "referrer-user-1",
    });

    const response = await POST(
      reviewRequest({
        status: "REJECTED",
        rejectionReason: "BOT_TRAFFIC",
        rejectionNote: "Traffic spike came from suspected bot traffic.",
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REJECTED",
          earnedAmount: 0,
          eligibleViews: 0,
          rejectionNote: "Traffic spike came from suspected bot traffic.",
        }),
      }),
    );
    expect(routeMocks.tx.campaignApplication.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { earnedAmount: { decrement: 43 } },
    });
    expect(routeMocks.reconcileReferralPayoutForSubmission).toHaveBeenCalledWith(
      routeMocks.tx,
      "submission-1",
    );
  });

  it("clamps legacy application earnings to zero when reversing more than the stored total", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        status: "APPROVED",
        earnedAmount: 42.75,
        eligibleViews: 4275,
        application: {
          id: "application-1",
          earnedAmount: 10,
        },
      }),
    );

    const response = await POST(
      reviewRequest({
        status: "REJECTED",
        rejectionReason: "BOT_TRAFFIC",
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignApplication.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { earnedAmount: { set: 0 } },
    });
  });

  it("repairs already-negative legacy application earnings while rejecting an approved submission", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        status: "APPROVED",
        earnedAmount: 42.75,
        eligibleViews: 4275,
        application: {
          id: "application-1",
          earnedAmount: -43,
        },
      }),
    );

    const response = await POST(
      reviewRequest({
        status: "REJECTED",
        rejectionReason: "BOT_TRAFFIC",
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignApplication.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { earnedAmount: { set: 0 } },
    });
  });

  it("blocks rejecting approved submissions that are already paid or locked in a payout run", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        status: "APPROVED",
        settledAt: new Date("2026-05-20T12:00:00.000Z"),
        payoutRunItems: [{ id: "payout-run-item-1" }],
      }),
    );

    const response = await POST(
      reviewRequest({
        status: "REJECTED",
        rejectionReason: "BOT_TRAFFIC",
        rejectionNote: "Botted traffic found after approval.",
      }),
      params,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This approved submission is already paid or locked in a payout run. Use a financial adjustment workflow instead.",
    });
    expect(routeMocks.tx.campaignSubmission.update).not.toHaveBeenCalled();
  });

  it("approves even when logo verification is pending", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({ logoStatus: "PENDING" }),
    );

    const response = await POST(
      reviewRequest({ status: "APPROVED" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
        }),
      }),
    );
  });

  it("approves without manual views and stores earnings from tracked metrics", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        baselineViews: 0,
        metricSnapshots: [{ viewCount: BigInt(5000) }],
        campaign: {
          id: "campaign-1",
          name: "Spring Campaign",
          creatorCpv: 0.01,
          minimumPaidViews: 5000,
          maximumPaidViews: null,
        },
      }),
    );

    const response = await POST(
      reviewRequest({ status: "APPROVED" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          viewCount: 5000,
          eligibleViews: 5000,
          earnedAmount: 50,
        }),
      }),
    );
  });

  it("caps the crossing approval at the remaining campaign budget while keeping eligible views", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        baselineViews: 0,
        metricSnapshots: [{ viewCount: BigInt(5000) }],
        campaign: {
          id: "campaign-1",
          name: "Spring Campaign",
          totalBudget: 100,
          creatorCpv: 0.01,
          minimumPaidViews: 0,
          maximumPaidViews: null,
        },
      }),
    );
    routeMocks.tx.campaign.findUnique.mockResolvedValue({
      totalBudget: 100,
      creatorCpv: 0.01,
      campaignSubmissions: [
        {
          id: "older-submission",
          eligibleViews: 9500,
          earnedAmount: 95,
          reviewedAt: new Date("2026-05-20T09:00:00.000Z"),
          createdAt: new Date("2026-05-20T08:00:00.000Z"),
          settledAt: null,
          payoutRunItems: [],
        },
        {
          id: "submission-1",
          eligibleViews: 5000,
          earnedAmount: 50,
          reviewedAt: new Date("2026-05-20T10:00:00.000Z"),
          createdAt: new Date("2026-05-20T10:00:00.000Z"),
          settledAt: null,
          payoutRunItems: [],
        },
      ],
    });
    routeMocks.tx.campaignSubmission.update
      .mockResolvedValueOnce({ id: "submission-1", status: "APPROVED", earnedAmount: 50 })
      .mockResolvedValueOnce({ id: "submission-1", status: "APPROVED", earnedAmount: 5 });

    const response = await POST(
      reviewRequest({ status: "APPROVED" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          viewCount: 5000,
          eligibleViews: 5000,
          earnedAmount: 50,
        }),
      }),
    );
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenNthCalledWith(
      2,
      {
        where: { id: "submission-1" },
        data: { earnedAmount: 5 },
      },
    );
    expect(routeMocks.tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "SUBMISSION_APPROVED",
        data: expect.objectContaining({ earnedAmount: 5 }),
      }),
    });
    expect(routeMocks.tx.campaignApplication.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { earnedAmount: { increment: 5 } },
    });
  });

  it("stores zero earnings after the campaign budget is exhausted while keeping eligible views", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        baselineViews: 0,
        metricSnapshots: [{ viewCount: BigInt(5000) }],
        campaign: {
          id: "campaign-1",
          name: "Spring Campaign",
          totalBudget: 100,
          creatorCpv: 0.01,
          minimumPaidViews: 0,
          maximumPaidViews: null,
        },
      }),
    );
    routeMocks.tx.campaign.findUnique.mockResolvedValue({
      totalBudget: 100,
      creatorCpv: 0.01,
      campaignSubmissions: [
        {
          id: "older-submission",
          eligibleViews: 10_000,
          earnedAmount: 100,
          reviewedAt: new Date("2026-05-20T09:00:00.000Z"),
          createdAt: new Date("2026-05-20T08:00:00.000Z"),
          settledAt: null,
          payoutRunItems: [],
        },
        {
          id: "submission-1",
          eligibleViews: 5000,
          earnedAmount: 50,
          reviewedAt: new Date("2026-05-20T10:00:00.000Z"),
          createdAt: new Date("2026-05-20T10:00:00.000Z"),
          settledAt: null,
          payoutRunItems: [],
        },
      ],
    });
    routeMocks.tx.campaignSubmission.update
      .mockResolvedValueOnce({ id: "submission-1", status: "APPROVED", earnedAmount: 50 })
      .mockResolvedValueOnce({ id: "submission-1", status: "APPROVED", earnedAmount: 0 });

    const response = await POST(
      reviewRequest({ status: "APPROVED" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          eligibleViews: 5000,
          earnedAmount: 50,
        }),
      }),
    );
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenNthCalledWith(
      2,
      {
        where: { id: "submission-1" },
        data: { earnedAmount: 0 },
      },
    );
    expect(routeMocks.tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "SUBMISSION_APPROVED",
        data: expect.objectContaining({ earnedAmount: 0 }),
      }),
    });
  });

  it("approves without manual views and leaves earnings at zero until metrics exist", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(submission());

    const response = await POST(
      reviewRequest({ status: "APPROVED" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          earnedAmount: 0,
        }),
      }),
    );
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          viewCount: expect.any(Number),
          eligibleViews: expect.any(Number),
        }),
      }),
    );
  });

  it("stores zero earnings for an automatically tracked clip below the campaign threshold", async () => {
    routeMocks.submissionFindUnique.mockResolvedValue(
      submission({
        baselineViews: 0,
        metricSnapshots: [{ viewCount: BigInt(200) }],
        campaign: {
          id: "campaign-1",
          name: "Spring Campaign",
          creatorCpv: 0.00045,
          minimumPaidViews: 5000,
          maximumPaidViews: null,
        },
      }),
    );

    const response = await POST(
      reviewRequest({ status: "APPROVED" }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.tx.campaignSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          viewCount: 200,
          eligibleViews: 0,
          earnedAmount: 0,
        }),
      }),
    );
  });
});
