import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tokenMocks = vi.hoisted(() => ({
  ttUpdate: vi.fn(),
  igUpdate: vi.fn(),
  ytUpdate: vi.fn(),
  decrypt: vi.fn(),
  encrypt: vi.fn(),
  refreshTikTokToken: vi.fn(),
  refreshInstagramToken: vi.fn(),
  refreshYoutubeToken: vi.fn(),
  resolveIncident: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creatorIgConnection: { update: tokenMocks.igUpdate },
    creatorTikTokConnection: { update: tokenMocks.ttUpdate },
    creatorYtConnection: { update: tokenMocks.ytUpdate },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: tokenMocks.decrypt,
  encrypt: tokenMocks.encrypt,
}));

vi.mock("@/lib/tiktok", () => ({
  refreshTikTokToken: tokenMocks.refreshTikTokToken,
}));

vi.mock("@/lib/instagram", () => ({
  isInstagramInvalidTokenError: (err: unknown) =>
    /OAuthException|access token|invalid token|expired/i.test(err instanceof Error ? err.message : String(err)),
  refreshInstagramToken: tokenMocks.refreshInstagramToken,
}));

vi.mock("@/lib/youtube", () => ({
  refreshYoutubeToken: tokenMocks.refreshYoutubeToken,
}));

vi.mock("@/lib/connection-health", () => ({
  resolveConnectionHealthIncident: tokenMocks.resolveIncident,
}));

import {
  forceRefreshInstagramAccessToken,
  forceRefreshTikTokAccessToken,
  forceRefreshYoutubeAccessToken,
  getFreshInstagramAccessToken,
  getFreshTikTokAccessToken,
  getFreshYoutubeAccessToken,
  withFreshInstagramAccessToken,
  withFreshTikTokAccessToken,
  withFreshYoutubeAccessToken,
} from "./token-refresh";

function conn(overrides: Record<string, unknown> = {}) {
  return {
    id: "tt_conn_1",
    accessToken: "stored-access",
    accessTokenIv: "access-iv",
    refreshToken: "stored-refresh",
    refreshTokenIv: "refresh-iv",
    tokenExpiresAt: new Date("2026-06-04T13:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  tokenMocks.ttUpdate.mockReset().mockResolvedValue({});
  tokenMocks.igUpdate.mockReset().mockResolvedValue({});
  tokenMocks.ytUpdate.mockReset().mockResolvedValue({});
  tokenMocks.refreshTikTokToken.mockReset();
  tokenMocks.refreshInstagramToken.mockReset();
  tokenMocks.refreshYoutubeToken.mockReset();
  tokenMocks.resolveIncident.mockReset().mockResolvedValue(undefined);
  tokenMocks.decrypt.mockReset().mockImplementation((ciphertext: string) => `plain:${ciphertext}`);
  tokenMocks.encrypt.mockReset().mockImplementation((value: string) => ({
    ciphertext: `enc:${value}`,
    iv: `iv:${value}`,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TikTok token refresh", () => {
  it("stores a rotated refresh token when TikTok returns one", async () => {
    tokenMocks.refreshTikTokToken.mockResolvedValue({
      accessToken: "fresh-access",
      expiresIn: 86400,
      refreshToken: "fresh-refresh",
      refreshExpiresIn: 31536000,
    });

    await expect(forceRefreshTikTokAccessToken(conn())).resolves.toBe("fresh-access");

    expect(tokenMocks.refreshTikTokToken).toHaveBeenCalledWith("plain:stored-refresh");
    expect(tokenMocks.ttUpdate).toHaveBeenCalledWith({
      where: { id: "tt_conn_1" },
      data: expect.objectContaining({
        accessToken: "enc:fresh-access",
        accessTokenIv: "iv:fresh-access",
        refreshToken: "enc:fresh-refresh",
        refreshTokenIv: "iv:fresh-refresh",
        tokenExpiresAt: new Date("2026-06-05T12:00:00.000Z"),
        refreshTokenExpiresAt: new Date("2027-06-04T12:00:00.000Z"),
      }),
    });
    expect(tokenMocks.resolveIncident).toHaveBeenCalledWith(
      "TT",
      "tt_conn_1",
      "REFRESH_SUCCEEDED",
    );
  });

  it("keeps the existing refresh token when TikTok does not rotate it", async () => {
    tokenMocks.refreshTikTokToken.mockResolvedValue({
      accessToken: "fresh-access",
      expiresIn: 86400,
    });

    await forceRefreshTikTokAccessToken(conn());

    const data = tokenMocks.ttUpdate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      accessToken: "enc:fresh-access",
      accessTokenIv: "iv:fresh-access",
    });
    expect(data).not.toHaveProperty("refreshToken");
    expect(data).not.toHaveProperty("refreshTokenIv");
  });

  it("does not silently return an expired access token when refresh fails", async () => {
    tokenMocks.refreshTikTokToken.mockRejectedValue(new Error("refresh failed"));

    const token = await getFreshTikTokAccessToken(
      conn({ tokenExpiresAt: new Date("2026-06-04T11:59:00.000Z") }),
    );

    expect(token).toBeNull();
  });

  it("retries an invalid-token operation once with a forced refresh", async () => {
    tokenMocks.refreshTikTokToken.mockResolvedValue({
      accessToken: "fresh-access",
      expiresIn: 86400,
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("access_token_invalid"))
      .mockResolvedValueOnce("ok");

    await expect(withFreshTikTokAccessToken(conn(), operation)).resolves.toBe("ok");

    expect(operation).toHaveBeenNthCalledWith(1, "plain:stored-access");
    expect(operation).toHaveBeenNthCalledWith(2, "fresh-access");
  });
});

describe("YouTube token refresh", () => {
  it("does not silently return an expired access token when refresh fails", async () => {
    tokenMocks.refreshYoutubeToken.mockRejectedValue(new Error("invalid_grant"));

    const token = await getFreshYoutubeAccessToken(
      conn({
        id: "yt_conn_1",
        tokenExpiresAt: new Date("2026-06-04T11:59:00.000Z"),
      }),
    );

    expect(token).toBeNull();
  });

  it("retries an invalid-token operation once with a forced refresh", async () => {
    tokenMocks.refreshYoutubeToken.mockResolvedValue({
      accessToken: "fresh-youtube-access",
      expiresIn: 3600,
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid Credentials 401"))
      .mockResolvedValueOnce("ok");

    await expect(withFreshYoutubeAccessToken(conn({ id: "yt_conn_1" }), operation)).resolves.toBe("ok");

    expect(operation).toHaveBeenNthCalledWith(1, "plain:stored-access");
    expect(operation).toHaveBeenNthCalledWith(2, "fresh-youtube-access");
    expect(tokenMocks.ytUpdate).toHaveBeenCalledWith({
      where: { id: "yt_conn_1" },
      data: expect.objectContaining({
        accessToken: "enc:fresh-youtube-access",
        accessTokenIv: "iv:fresh-youtube-access",
        tokenExpiresAt: new Date("2026-06-04T13:00:00.000Z"),
      }),
    });
  });

  it("persists forced YouTube refreshes", async () => {
    tokenMocks.refreshYoutubeToken.mockResolvedValue({
      accessToken: "fresh-youtube-access",
      expiresIn: 3600,
    });

    await expect(forceRefreshYoutubeAccessToken(conn({ id: "yt_conn_1" }))).resolves.toBe("fresh-youtube-access");

    expect(tokenMocks.refreshYoutubeToken).toHaveBeenCalledWith("plain:stored-refresh");
    expect(tokenMocks.ytUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "yt_conn_1" } }),
    );
    expect(tokenMocks.resolveIncident).toHaveBeenCalledWith(
      "YT",
      "yt_conn_1",
      "REFRESH_SUCCEEDED",
    );
  });
});

describe("Instagram token refresh", () => {
  it("refreshes and persists Instagram long-lived access tokens near expiry", async () => {
    tokenMocks.refreshInstagramToken.mockResolvedValue({
      accessToken: "fresh-instagram-access",
      expiresIn: 5184000,
    });

    const token = await getFreshInstagramAccessToken(
      conn({
        id: "ig_conn_1",
        refreshToken: null,
        refreshTokenIv: null,
        tokenExpiresAt: new Date("2026-06-10T12:00:00.000Z"),
      }),
    );

    expect(token).toBe("fresh-instagram-access");
    expect(tokenMocks.refreshInstagramToken).toHaveBeenCalledWith("plain:stored-access");
    expect(tokenMocks.igUpdate).toHaveBeenCalledWith({
      where: { id: "ig_conn_1" },
      data: expect.objectContaining({
        accessToken: "enc:fresh-instagram-access",
        accessTokenIv: "iv:fresh-instagram-access",
        tokenExpiresAt: new Date("2026-08-03T12:00:00.000Z"),
      }),
    });
  });

  it("retries an invalid-token Instagram operation once with a forced refresh", async () => {
    tokenMocks.refreshInstagramToken.mockResolvedValue({
      accessToken: "fresh-instagram-access",
      expiresIn: 5184000,
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("OAuthException: Error validating access token"))
      .mockResolvedValueOnce("ok");

    await expect(
      withFreshInstagramAccessToken(
        conn({
          id: "ig_conn_1",
          refreshToken: null,
          refreshTokenIv: null,
          tokenExpiresAt: new Date("2026-07-01T12:00:00.000Z"),
        }),
        operation,
      ),
    ).resolves.toBe("ok");

    expect(operation).toHaveBeenNthCalledWith(1, "plain:stored-access");
    expect(operation).toHaveBeenNthCalledWith(2, "fresh-instagram-access");
  });

  it("does not silently return an expired Instagram token when refresh fails", async () => {
    tokenMocks.refreshInstagramToken.mockRejectedValue(new Error("Instagram token refresh failed"));

    const token = await getFreshInstagramAccessToken(
      conn({
        id: "ig_conn_1",
        refreshToken: null,
        refreshTokenIv: null,
        tokenExpiresAt: new Date("2026-06-04T11:59:00.000Z"),
      }),
    );

    expect(token).toBeNull();
  });

  it("persists forced Instagram refreshes", async () => {
    tokenMocks.refreshInstagramToken.mockResolvedValue({
      accessToken: "fresh-instagram-access",
      expiresIn: 5184000,
    });

    await expect(
      forceRefreshInstagramAccessToken(
        conn({
          id: "ig_conn_1",
          refreshToken: null,
          refreshTokenIv: null,
        }),
      ),
    ).resolves.toBe("fresh-instagram-access");

    expect(tokenMocks.igUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ig_conn_1" } }),
    );
    expect(tokenMocks.resolveIncident).toHaveBeenCalledWith(
      "IG",
      "ig_conn_1",
      "REFRESH_SUCCEEDED",
    );
  });
});
