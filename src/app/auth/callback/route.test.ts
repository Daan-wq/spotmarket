import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  attributionUpdateMany: vi.fn(),
  joinDiscordGuildWithOAuthToken: vi.fn(),
  signOut: vi.fn(),
  getIdentitySignals: vi.fn(),
  assessBanEvasion: vi.fn(),
  recordAccessSignals: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: routeMocks.exchangeCodeForSession,
      signOut: routeMocks.signOut,
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: routeMocks.userFindUnique,
      update: routeMocks.userUpdate,
    },
    campaignReferralAttribution: {
      updateMany: routeMocks.attributionUpdateMany,
    },
  },
}));

vi.mock("@/lib/discord-campaign-roles", () => ({
  joinDiscordGuildWithOAuthToken: routeMocks.joinDiscordGuildWithOAuthToken,
}));

vi.mock("@/lib/ban-evasion/identity-signals", () => ({
  getIdentitySignalsForSupabaseUser: routeMocks.getIdentitySignals,
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: routeMocks.assessBanEvasion,
}));

vi.mock("@/lib/ban-evasion/store", () => ({
  recordAccessSignals: routeMocks.recordAccessSignals,
}));

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    supabaseId: "old-supabase",
    email: "creator@example.com",
    role: "creator",
    discordId: "discord-1",
    discordUsername: "Old Name",
    creatorProfile: null,
    ...overrides,
  };
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          provider_token: "discord-token",
          user: {
            id: "new-supabase",
            email: "creator@example.com",
            app_metadata: { provider: "discord" },
            user_metadata: { provider_id: "discord-1", full_name: "New Name" },
          },
        },
      },
      error: null,
    });
    routeMocks.userFindUnique.mockResolvedValue(null);
    routeMocks.userUpdate.mockResolvedValue(dbUser({ supabaseId: "new-supabase", discordUsername: "New Name" }));
    routeMocks.attributionUpdateMany.mockResolvedValue({ count: 1 });
    routeMocks.joinDiscordGuildWithOAuthToken.mockResolvedValue({ ok: true });
    routeMocks.signOut.mockResolvedValue({ error: null });
    routeMocks.getIdentitySignals.mockResolvedValue({
      userId: "user-1",
      role: "creator",
      signals: [],
    });
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [
        {
          type: "DEVICE",
          valueHash: "v1:device",
          maskedValue: "devi...1234",
        },
      ],
    });
    routeMocks.recordAccessSignals.mockResolvedValue(undefined);
  });

  it("claims a stale Discord user during OAuth login", async () => {
    const stale = dbUser();
    routeMocks.userFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if (where.supabaseId === "new-supabase") return null;
      if (where.discordId === "discord-1") return stale;
      if (where.email === "creator@example.com") return stale;
      return null;
    });

    const response = await GET(new Request("https://app.test/auth/callback?code=abc&next=/creator/campaigns"));

    expect(response.headers.get("location")).toBe("https://app.test/creator/campaigns");
    expect(routeMocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          supabaseId: "new-supabase",
          discordUsername: "New Name",
        }),
      }),
    );
    expect(routeMocks.assessBanEvasion).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectRole: "creator",
        supabaseId: "new-supabase",
        identitySignals: [{ type: "DISCORD", value: "discord-1" }],
      }),
    );
  });

  it("signs out and returns a generic denial for a matched OAuth identity", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await GET(
      new Request(
        "https://app.test/auth/callback?code=abc&next=/creator/campaigns",
      ),
    );

    expect(routeMocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(response.headers.get("location")).toBe(
      "https://app.test/sign-in?auth_error=access_denied",
    );
    expect(routeMocks.joinDiscordGuildWithOAuthToken).not.toHaveBeenCalled();
  });
});
