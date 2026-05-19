import { afterEach, describe, expect, test, vi } from "vitest";
import { getRequiredOAuthEnv, getRequiredOAuthRedirectUri } from "./oauth-env";
import { getYoutubeAuthUrl } from "./youtube";

const savedEnv = { ...process.env };

afterEach(() => {
  process.env = { ...savedEnv };
  vi.unstubAllEnvs();
});

describe("OAuth environment values", () => {
  test("trims accidental CRLF around required OAuth values", () => {
    const value = getRequiredOAuthEnv("GOOGLE_CLIENT_ID", {
      GOOGLE_CLIENT_ID: "  772086117833-example.apps.googleusercontent.com\r\n",
    });

    expect(value).toBe("772086117833-example.apps.googleusercontent.com");
  });

  test("rejects missing or blank OAuth values", () => {
    expect(() => getRequiredOAuthEnv("GOOGLE_CLIENT_ID", {})).toThrow(
      "GOOGLE_CLIENT_ID is required"
    );
    expect(() =>
      getRequiredOAuthEnv("GOOGLE_CLIENT_ID", { GOOGLE_CLIENT_ID: " \r\n\t" })
    ).toThrow("GOOGLE_CLIENT_ID is required");
  });

  test("rejects embedded control characters after trimming", () => {
    expect(() =>
      getRequiredOAuthEnv("GOOGLE_CLIENT_ID", {
        GOOGLE_CLIENT_ID: "client\r\nid",
      })
    ).toThrow("GOOGLE_CLIENT_ID contains invalid control characters");
  });

  test("validates redirect URLs and allows local HTTP only outside production", () => {
    expect(
      getRequiredOAuthRedirectUri("YOUTUBE_REDIRECT_URI", {
        YOUTUBE_REDIRECT_URI: "https://app.clipprofit.com/api/auth/youtube/callback\r\n",
        NODE_ENV: "production",
      })
    ).toBe("https://app.clipprofit.com/api/auth/youtube/callback");

    expect(
      getRequiredOAuthRedirectUri("YOUTUBE_REDIRECT_URI", {
        YOUTUBE_REDIRECT_URI: "http://localhost:3000/api/auth/youtube/callback",
        NODE_ENV: "development",
      })
    ).toBe("http://localhost:3000/api/auth/youtube/callback");

    expect(() =>
      getRequiredOAuthRedirectUri("YOUTUBE_REDIRECT_URI", {
        YOUTUBE_REDIRECT_URI: "http://localhost:3000/api/auth/youtube/callback",
        NODE_ENV: "production",
      })
    ).toThrow("YOUTUBE_REDIRECT_URI must use HTTPS");

    expect(() =>
      getRequiredOAuthRedirectUri("YOUTUBE_REDIRECT_URI", {
        YOUTUBE_REDIRECT_URI: "not a url",
      })
    ).toThrow("YOUTUBE_REDIRECT_URI must be a valid URL");
  });

  test("generates YouTube auth URLs without CRLF escapes from copied env values", () => {
    process.env.GOOGLE_CLIENT_ID =
      "772086117833-o1oakjiuuap9d472ktmpagcjlrrnrj6j.apps.googleusercontent.com\r\n";
    process.env.YOUTUBE_REDIRECT_URI =
      "https://app.clipprofit.com/api/auth/youtube/callback\r\n";

    const authUrl = getYoutubeAuthUrl("state-token");
    const parsed = new URL(authUrl);

    expect(authUrl).not.toContain("%0D");
    expect(authUrl).not.toContain("%0A");
    expect(parsed.searchParams.get("client_id")).toBe(
      "772086117833-o1oakjiuuap9d472ktmpagcjlrrnrj6j.apps.googleusercontent.com"
    );
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://app.clipprofit.com/api/auth/youtube/callback"
    );
    expect(parsed.searchParams.get("prompt")).toBe("consent select_account");
  });
});
