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
  function postWithdraw(body?: unknown) {
    return POST(
      new Request("http://localhost/api/wallet/withdraw", {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        payoutIban: "NL91ABNA0417164300",
        payoutAccountName: "Clipper Name",
        payoutSolanaAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
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
        payoutSolanaAddress: null,
      },
    });

    const response = await postWithdraw({ amount: 20 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add your IBAN and account holder name before requesting a payout.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("blocks duplicate open payout requests", async () => {
    routeMocks.payoutFindFirst.mockResolvedValueOnce({ id: "payout-open" });

    const response = await postWithdraw({ amount: 20 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "You already have a payout request in progress.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("requires an amount", async () => {
    const response = await postWithdraw({});

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Withdrawal amount is required.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("requires the requested amount to be at least EUR 20", async () => {
    const response = await postWithdraw({ amount: 19.99 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Minimum withdrawal amount is EUR 20",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("requires the requested amount to use euro cents", async () => {
    const response = await postWithdraw({ amount: 20.999 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Withdrawal amount must use euro cents.",
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

    const response = await postWithdraw({ amount: 20 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Minimum withdrawal amount is EUR 20",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("does not allow withdrawing more than the available balance", async () => {
    const response = await postWithdraw({ amount: 43 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Withdrawal amount exceeds available balance.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("creates a pending bank-transfer payout for the requested amount", async () => {
    routeMocks.payoutCreate.mockResolvedValueOnce({
      id: "payout-1",
      amount: 25.5,
      status: "pending",
      currency: "EUR",
      paymentMethod: "BANK_TRANSFER",
      bankIbanSnapshot: "NL91ABNA0417164300",
      bankAccountNameSnapshot: "Clipper Name",
      requestedAt: new Date("2026-05-19T12:00:00.000Z"),
    });

    const response = await postWithdraw({ amount: 25.5 });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      withdrawal: expect.objectContaining({
        id: "payout-1",
        amount: 25.5,
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
        amount: 25.5,
        status: "pending",
        paymentMethod: "BANK_TRANSFER",
        bankIbanSnapshot: "NL91ABNA0417164300",
        bankAccountNameSnapshot: "Clipper Name",
        applicationIds: [],
      }),
    });
  });

  it("requires a saved Solana address before requesting a USDC-Solana payout", async () => {
    routeMocks.userFindUnique.mockResolvedValueOnce({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        payoutIban: "NL91ABNA0417164300",
        payoutAccountName: "Clipper Name",
        payoutSolanaAddress: null,
      },
    });

    const response = await postWithdraw({ amount: 20, method: "USDC_SOLANA" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add your Solana wallet address before requesting a USDC payout.",
    });
    expect(routeMocks.payoutCreate).not.toHaveBeenCalled();
  });

  it("creates a pending crypto payout request with a Solana wallet snapshot", async () => {
    routeMocks.payoutCreate.mockResolvedValueOnce({
      id: "payout-crypto-1",
      amount: 25.5,
      status: "pending",
      currency: "EUR",
      paymentMethod: "CRYPTO",
      walletAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      requestedAt: new Date("2026-05-19T12:00:00.000Z"),
    });

    const response = await postWithdraw({ amount: 25.5, method: "USDC_SOLANA" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      withdrawal: expect.objectContaining({
        id: "payout-crypto-1",
        amount: 25.5,
        status: "pending",
        currency: "EUR",
        paymentMethod: "CRYPTO",
        walletAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        network: "SOLANA",
      }),
    });
    expect(routeMocks.payoutCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorProfileId: "creator-profile-1",
        amount: 25.5,
        status: "pending",
        paymentMethod: "CRYPTO",
        walletAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        applicationIds: [],
      }),
    });
  });
});
