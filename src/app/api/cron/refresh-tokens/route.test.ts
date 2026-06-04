import { beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({
  verifyCron: vi.fn(),
  igFindMany: vi.fn(),
  igUpdate: vi.fn(),
  ytFindMany: vi.fn(),
  ytUpdate: vi.fn(),
  ttFindMany: vi.fn(),
  forceRefreshInstagramAccessToken: vi.fn(),
  forceRefreshTikTokAccessToken: vi.fn(),
  forceRefreshYoutubeAccessToken: vi.fn(),
  recordAccountRefreshFailure: vi.fn(),
  decrypt: vi.fn(),
  encrypt: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  verifyCron: cronMocks.verifyCron,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creatorIgConnection: {
      findMany: cronMocks.igFindMany,
      update: cronMocks.igUpdate,
    },
    creatorYtConnection: {
      findMany: cronMocks.ytFindMany,
      update: cronMocks.ytUpdate,
    },
    creatorTikTokConnection: {
      findMany: cronMocks.ttFindMany,
    },
  },
}));

vi.mock("@/lib/token-refresh", () => ({
  forceRefreshInstagramAccessToken: cronMocks.forceRefreshInstagramAccessToken,
  forceRefreshTikTokAccessToken: cronMocks.forceRefreshTikTokAccessToken,
  forceRefreshYoutubeAccessToken: cronMocks.forceRefreshYoutubeAccessToken,
}));

vi.mock("@/lib/social-account-refresh", () => ({
  recordAccountRefreshFailure: cronMocks.recordAccountRefreshFailure,
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: cronMocks.decrypt,
  encrypt: cronMocks.encrypt,
}));

import { POST } from "./route";

describe("POST /api/cron/refresh-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cronMocks.verifyCron.mockReturnValue(true);
    cronMocks.igFindMany.mockResolvedValue([]);
    cronMocks.ytFindMany.mockResolvedValue([]);
    cronMocks.recordAccountRefreshFailure.mockResolvedValue(undefined);
    cronMocks.forceRefreshInstagramAccessToken.mockResolvedValue("fresh-ig-token");
    cronMocks.ttFindMany.mockResolvedValue([
      {
        id: "tt_conn",
        username: "creator",
        accessToken: "access",
        accessTokenIv: "access-iv",
        refreshToken: "refresh",
        refreshTokenIv: "refresh-iv",
        tokenExpiresAt: new Date("2026-06-04T13:00:00.000Z"),
      },
    ]);
    cronMocks.forceRefreshTikTokAccessToken.mockResolvedValue("fresh-token");
    cronMocks.forceRefreshYoutubeAccessToken.mockResolvedValue("fresh-yt-token");
  });

  it("refreshes TikTok connections and reports TikTok results", async () => {
    const response = await POST(new Request("https://app.test/api/cron/refresh-tokens"));
    const body = await response.json();

    expect(cronMocks.ttFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refreshToken: { not: null },
          refreshTokenIv: { not: null },
        }),
        take: 50,
      }),
    );
    expect(cronMocks.forceRefreshTikTokAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: "tt_conn" }),
    );
    expect(body.tiktok).toEqual({ refreshed: 1, failed: 0, total: 1 });
  });

  it("records TikTok refresh failures without failing the whole cron", async () => {
    cronMocks.forceRefreshTikTokAccessToken.mockRejectedValue(new Error("refresh failed"));

    const response = await POST(new Request("https://app.test/api/cron/refresh-tokens"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cronMocks.recordAccountRefreshFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "TT",
        connectionId: "tt_conn",
        code: "TOKEN_REFRESH_FAILED",
      }),
    );
    expect(body.tiktok).toEqual({ refreshed: 0, failed: 1, total: 1 });
  });

  it("records Instagram and YouTube refresh failures without failing the whole cron", async () => {
    cronMocks.igFindMany.mockResolvedValue([
      {
        id: "ig_conn",
        igUsername: "creator",
        accessToken: "access",
        accessTokenIv: "iv",
        tokenExpiresAt: new Date("2026-06-04T13:00:00.000Z"),
      },
    ]);
    cronMocks.ytFindMany.mockResolvedValue([
      {
        id: "yt_conn",
        channelName: "Creator Channel",
        accessToken: "access",
        accessTokenIv: "iv",
        refreshToken: "refresh",
        refreshTokenIv: "refresh-iv",
        tokenExpiresAt: new Date("2026-06-04T13:00:00.000Z"),
      },
    ]);
    cronMocks.forceRefreshInstagramAccessToken.mockRejectedValue(new Error("ig refresh failed"));
    cronMocks.forceRefreshYoutubeAccessToken.mockRejectedValue(new Error("yt refresh failed"));

    const response = await POST(new Request("https://app.test/api/cron/refresh-tokens"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cronMocks.recordAccountRefreshFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "IG",
        connectionId: "ig_conn",
        code: "TOKEN_REFRESH_FAILED",
      }),
    );
    expect(cronMocks.recordAccountRefreshFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "YT",
        connectionId: "yt_conn",
        code: "TOKEN_REFRESH_FAILED",
      }),
    );
    expect(body.instagram).toEqual({ refreshed: 0, failed: 1, total: 1 });
    expect(body.youtube).toEqual({ refreshed: 0, failed: 1, total: 1 });
  });
});
