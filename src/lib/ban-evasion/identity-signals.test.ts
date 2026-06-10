import { describe, expect, it, vi } from "vitest";
import { getIdentitySignalsForSupabaseUser } from "./identity-signals";

describe("getIdentitySignalsForSupabaseUser", () => {
  it("collects stable creator identity and payout identifiers", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "user-1",
      role: "creator",
      discordId: "discord-1",
      creatorProfile: {
        walletAddress: "0xwallet",
        tronsAddress: "Ttron",
        payoutIban: "NL00BANK0123456789",
        payoutSolanaAddress: "SolanaAddress",
        stripeAccountId: "acct_123",
        igConnections: [{ igUserId: "ig-1" }, { igUserId: null }],
        fbConnections: [{ fbPageId: "page-1", fbUserId: "fb-user-1" }],
        ytConnections: [{ channelId: "youtube-1" }],
        ttConnections: [{ tikTokOpenId: "tiktok-1" }],
      },
    });

    await expect(
      getIdentitySignalsForSupabaseUser("supabase-1", { findUnique }),
    ).resolves.toEqual({
      userId: "user-1",
      role: "creator",
      signals: [
        { type: "DISCORD", value: "discord-1" },
        { type: "INSTAGRAM", value: "ig-1" },
        { type: "FACEBOOK", value: "page-1" },
        { type: "FACEBOOK", value: "fb-user-1" },
        { type: "YOUTUBE", value: "youtube-1" },
        { type: "TIKTOK", value: "tiktok-1" },
        { type: "PAYOUT", value: "0xwallet" },
        { type: "PAYOUT", value: "Ttron" },
        { type: "PAYOUT", value: "NL00BANK0123456789" },
        { type: "PAYOUT", value: "SolanaAddress" },
        { type: "PAYOUT", value: "acct_123" },
      ],
    });
  });

  it("returns no creator signals for an unknown user", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);

    await expect(
      getIdentitySignalsForSupabaseUser("missing", { findUnique }),
    ).resolves.toEqual({ userId: null, role: null, signals: [] });
  });
});
