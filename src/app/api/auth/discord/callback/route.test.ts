import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  joinDiscordGuildWithOAuthToken: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: routeMocks.getUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: routeMocks.userFindUnique,
      update: routeMocks.userUpdate,
    },
  },
}));

vi.mock("@/lib/discord-campaign-roles", () => ({
  joinDiscordGuildWithOAuthToken: routeMocks.joinDiscordGuildWithOAuthToken,
}));

function encodeState(state: unknown) {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "current-user",
    supabaseId: "current-supabase",
    email: "creator@example.com",
    role: "creator",
    discordId: null,
    discordUsername: null,
    creatorProfile: null,
    ...overrides,
  };
}

describe("GET /api/auth/discord/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_CLIENT_ID = "client";
    process.env.DISCORD_CLIENT_SECRET = "secret";
    process.env.DISCORD_OAUTH_REDIRECT_URI = "https://app.test/api/auth/discord/callback";
    routeMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "current-supabase",
          email: "creator@example.com",
          app_metadata: {},
          user_metadata: {},
        },
      },
    });
    routeMocks.joinDiscordGuildWithOAuthToken.mockResolvedValue({ ok: true });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "access-token", scope: "identify guilds.join" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "discord-1", username: "DiscordUser" }),
      });
  });

  it("redirects with discord_already_linked when another user owns the Discord ID", async () => {
    routeMocks.userFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if (where.supabaseId === "current-supabase") return dbUser();
      if (where.discordId === "discord-1") {
        return dbUser({
          id: "other-user",
          supabaseId: "other-supabase",
          email: "other@example.com",
          discordId: "discord-1",
        });
      }
      if (where.email === "creator@example.com") return dbUser();
      return null;
    });

    const state = encodeState({ sub: "current-supabase", returnTo: "/creator/campaigns" });
    const response = await GET(
      new NextRequest(`https://app.test/api/auth/discord/callback?code=abc&state=${state}`),
    );

    expect(response.headers.get("location")).toBe("https://app.test/creator/campaigns?error=discord_already_linked");
    expect(routeMocks.userUpdate).not.toHaveBeenCalled();
  });
});
