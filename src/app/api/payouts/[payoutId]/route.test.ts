import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  payoutFindUnique: vi.fn(),
  payoutUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    payout: {
      findUnique: routeMocks.payoutFindUnique,
      update: routeMocks.payoutUpdate,
    },
    auditLog: { create: routeMocks.auditLogCreate },
  },
}));

const params = { params: Promise.resolve({ payoutId: "payout-1" }) };

function patchRequest(body: unknown) {
  return new Request("https://app.test/api/payouts/payout-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/payouts/[payoutId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({ id: "admin-user-1" });
    routeMocks.payoutFindUnique.mockResolvedValue({
      id: "payout-1",
      status: "pending",
      paymentMethod: "BANK_TRANSFER",
      bankReference: null,
      rejectionReason: null,
    });
    routeMocks.payoutUpdate.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "payout-1",
        ...data,
      }),
    );
    routeMocks.auditLogCreate.mockResolvedValue({});
  });

  it("requires a bank reference before confirming a bank-transfer payout", async () => {
    const response = await PATCH(patchRequest({ status: "confirmed" }), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Bank reference is required to mark this payout as paid.",
    });
    expect(routeMocks.payoutUpdate).not.toHaveBeenCalled();
  });

  it("marks a bank-transfer payout as confirmed with a bank reference", async () => {
    const response = await PATCH(
      patchRequest({ status: "confirmed", bankReference: "ABN transfer 123" }),
      params,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "payout-1",
        status: "confirmed",
        bankReference: "ABN transfer 123",
      }),
    );
    expect(routeMocks.payoutUpdate).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: expect.objectContaining({
        status: "confirmed",
        bankReference: "ABN transfer 123",
        confirmedAt: expect.any(Date),
        processedAt: expect.any(Date),
      }),
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "payout.confirmed",
        entityId: "payout-1",
        metadata: expect.objectContaining({
          bankReference: "ABN transfer 123",
          paymentMethod: "BANK_TRANSFER",
        }),
      }),
    });
  });

  it("allows sent bank-transfer payouts to become confirmed with the stored bank reference", async () => {
    routeMocks.payoutFindUnique.mockResolvedValueOnce({
      id: "payout-1",
      status: "sent",
      paymentMethod: "BANK_TRANSFER",
      bankReference: "ABN transfer 123",
      rejectionReason: null,
    });

    const response = await PATCH(patchRequest({ status: "confirmed" }), params);

    expect(response.status).toBe(200);
    expect(routeMocks.payoutUpdate).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: expect.objectContaining({
        status: "confirmed",
        confirmedAt: expect.any(Date),
        processedAt: expect.any(Date),
      }),
    });
  });

  it("rejects administrative rollback of confirmed payouts", async () => {
    routeMocks.payoutFindUnique.mockResolvedValueOnce({
      id: "payout-1",
      status: "confirmed",
      paymentMethod: "BANK_TRANSFER",
      bankReference: "ABN transfer 123",
      rejectionReason: null,
    });

    const response = await PATCH(
      patchRequest({
        status: "failed",
        rejectionReason: "Accidental rollback after payment.",
      }),
      params,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Confirmed payouts are terminal. Create a financial adjustment instead.",
    });
    expect(routeMocks.payoutUpdate).not.toHaveBeenCalled();
    expect(routeMocks.auditLogCreate).not.toHaveBeenCalled();
  });

  it("rejects moving sent payouts anywhere except confirmed", async () => {
    routeMocks.payoutFindUnique.mockResolvedValueOnce({
      id: "payout-1",
      status: "sent",
      paymentMethod: "BANK_TRANSFER",
      bankReference: "ABN transfer 123",
      rejectionReason: null,
    });

    const response = await PATCH(
      patchRequest({
        status: "failed",
        rejectionReason: "Rollback attempt.",
      }),
      params,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Sent payouts can only be confirmed. Create a financial adjustment instead.",
    });
    expect(routeMocks.payoutUpdate).not.toHaveBeenCalled();
  });

  it("requires a transaction hash before confirming a crypto payout", async () => {
    routeMocks.payoutFindUnique.mockResolvedValueOnce({
      id: "payout-1",
      status: "pending",
      paymentMethod: "CRYPTO",
      txHash: null,
      bankReference: null,
    });

    const response = await PATCH(patchRequest({ status: "confirmed" }), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Transaction hash is required to mark this crypto payout as paid.",
    });
    expect(routeMocks.payoutUpdate).not.toHaveBeenCalled();
  });

  it("marks a crypto payout as confirmed with a transaction hash", async () => {
    routeMocks.payoutFindUnique.mockResolvedValueOnce({
      id: "payout-1",
      status: "pending",
      paymentMethod: "CRYPTO",
      txHash: null,
      bankReference: null,
    });

    const response = await PATCH(
      patchRequest({ status: "confirmed", txHash: "5YTxHashForSolanaManualPayout" }),
      params,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "payout-1",
        status: "confirmed",
        txHash: "5YTxHashForSolanaManualPayout",
      }),
    );
    expect(routeMocks.payoutUpdate).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: expect.objectContaining({
        status: "confirmed",
        txHash: "5YTxHashForSolanaManualPayout",
        confirmedAt: expect.any(Date),
        processedAt: expect.any(Date),
      }),
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "payout.confirmed",
        entityId: "payout-1",
        metadata: expect.objectContaining({
          txHash: "5YTxHashForSolanaManualPayout",
          paymentMethod: "CRYPTO",
        }),
      }),
    });
  });

  it("requires an internal rejection reason before rejecting a payout request", async () => {
    const response = await PATCH(patchRequest({ status: "failed" }), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Internal rejection reason is required.",
    });
    expect(routeMocks.payoutUpdate).not.toHaveBeenCalled();
  });

  it("marks a rejected payout request as failed without mutating balance directly", async () => {
    const response = await PATCH(
      patchRequest({
        status: "failed",
        rejectionReason: "Marked paid before the manual bank transfer was sent.",
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.payoutUpdate).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: expect.objectContaining({
        status: "failed",
        processedAt: expect.any(Date),
        rejectionReason: "Marked paid before the manual bank transfer was sent.",
      }),
    });
    expect(routeMocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "payout.failed",
        entityId: "payout-1",
        metadata: expect.objectContaining({
          rejectionReason: "Marked paid before the manual bank transfer was sent.",
          paymentMethod: "BANK_TRANSFER",
        }),
      }),
    });
  });
});
