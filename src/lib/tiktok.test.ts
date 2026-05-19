import { afterEach, describe, expect, test, vi } from "vitest";
import { getTikTokAuthUrl, REQUIRED_TT_SCOPES } from "./tiktok";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TikTok OAuth URL", () => {
  test("uses the documented authorize endpoint and requires explicit account authorization", () => {
    vi.stubEnv("TIKTOK_CLIENT_KEY", "client-key");
    vi.stubEnv(
      "TIKTOK_REDIRECT_URI",
      "https://app.clipprofit.com/api/auth/tiktok/callback"
    );

    const authUrl = getTikTokAuthUrl("state-token");
    const parsed = new URL(authUrl);

    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      "https://www.tiktok.com/v2/auth/authorize/"
    );
    expect(parsed.searchParams.get("client_key")).toBe("client-key");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://app.clipprofit.com/api/auth/tiktok/callback"
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(REQUIRED_TT_SCOPES.join(","));
    expect(parsed.searchParams.get("state")).toBe("state-token");
    expect(parsed.searchParams.get("disable_auto_auth")).toBe("1");
  });
});
