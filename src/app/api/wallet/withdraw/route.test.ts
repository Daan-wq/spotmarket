import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  payoutFindFirst: vi.fn(),
  payoutCreate: vi.fn(),
  getCreatorPaymentSummary: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    payout: {
      findFirst: routeMocks.payoutFindFirst,
      create: routeMocks.payoutCreate,
    },
  },
}));

vi.mock("@/lib/creator-payment-summary", () => ({
  getCreatorPaymentSummary: routeMocks.getCreatorPaymentSummary,
}));

describe("POST /api/wallet/withdraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        payoutIban: "NL91ABNA0417164300",
        payoutAccountName: "Clipper Name",
      },
    });
    routeMocks.payoutFindFirst.mockResolvedValue(null);
    routeMocks.getCreatorPaymentSummary.mockResolvedValue({
      availableBalance: 42.35,
      pendingPayout: 0,
      profit: 0,
      totalEarned: 42.35,
      totalPaid: 0,
      earningsByCampaign: [],
    });
    routeMocks.payoutCreate.mockResolvedValue({
      id: "payout-1",
      amount: 42.35,
      status: "pending",
      currency: "EUR",
      paymentMethod: "BANK_TRANSFER",
      bankIbanSnapshot: "NL91ABNA0417164300",
      bankAccountNameSnapshot: "Clipper Name",
      requestedAt: new Date("2026-05-19T12:00:00.000Z"),
    });
  });

  it("requires saved IBAN details before requesting payout", async () => {
    routeMocks.userFindUnique.mockResolvedValueOnce({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        payoutIban: null,
        payoutAccountName: null,
      },
    });

    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add your IBAN and account holder name before requesting a payout.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("blocks duplicate open payout requests", async () => {
    routeMocks.payoutFindFirst.mockResolvedValueOnce({ id: "payout-open" });

    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "You already have a payout request in progress.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("requires at least EUR 20 available balance", async () => {
    routeMocks.getCreatorPaymentSummary.mockResolvedValueOnce({
      availableBalance: 19.99,
      pendingPayout: 0,
      profit: 0,
      totalEarned: 19.99,
      totalPaid: 0,
      earningsByCampaign: [],
    });

    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Minimum withdrawal amount is EUR 20",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("creates a pending bank-transfer payout for the full available balance", async () => {
    const response = await POST();

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      withdrawal: expect.objectContaining({
        id: "payout-1",
        amount: 42.35,
        status: "pending",
        currency: "EUR",
        paymentMethod: "BANK_TRANSFER",
        bankIban: "NL91ABNA0417164300",
        bankAccountName: "Clipper Name",
      }),
    });
    expect(routeMocks.payoutCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorProfileId: "creator-profile-1",
        amount: 42.35,
        status: "pending",
        paymentMethod: "BANK_TRANSFER",
        bankIbanSnapshot: "NL91ABNA0417164300",
        bankAccountNameSnapshot: "Clipper Name",
        applicationIds: [],
      }),
    });
  });
});
