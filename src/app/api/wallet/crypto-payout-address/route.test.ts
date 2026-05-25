import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  creatorProfileUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    creatorProfile: { update: routeMocks.creatorProfileUpdate },
  },
}));

describe("POST /api/wallet/crypto-payout-address", () => {
  function postAddress(body: unknown) {
    return POST(
      new NextRequest("http://localhost/api/wallet/crypto-payout-address", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: { id: "creator-profile-1" },
    });
    routeMocks.creatorProfileUpdate.mockResolvedValue({});
  });

  it("rejects non-Solana payout addresses", async () => {
    const response = await postAddress({
      solanaAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Enter a valid Solana wallet address.",
    });
    expect(routeMocks.creatorProfileUpdate).not.toHaveBeenCalled();
  });

  it("saves a normalized Solana payout address for the creator", async () => {
    const response = await postAddress({
      solanaAddress: "  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  ",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      payoutSolanaAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      solanaAddress: "EPjFWd...yTDt1v",
      network: "SOLANA",
      token: "USDC",
    });
    expect(routeMocks.creatorProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "creator-user-1" },
      data: {
        payoutSolanaAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      },
    });
  });
});
