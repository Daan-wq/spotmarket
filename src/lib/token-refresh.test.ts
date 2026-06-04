import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tokenMocks = vi.hoisted(() => ({
  ttUpdate: vi.fn(),
  ytUpdate: vi.fn(),
  decrypt: vi.fn(),
  encrypt: vi.fn(),
  refreshTikTokToken: vi.fn(),
  refreshYoutubeToken: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
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

vi.mock("@/lib/youtube", () => ({
  refreshYoutubeToken: tokenMocks.refreshYoutubeToken,
}));

import {
  forceRefreshTikTokAccessToken,
  getFreshTikTokAccessToken,
  withFreshTikTokAccessToken,
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
  tokenMocks.ytUpdate.mockReset().mockResolvedValue({});
  tokenMocks.refreshTikTokToken.mockReset();
  tokenMocks.refreshYoutubeToken.mockReset();
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
