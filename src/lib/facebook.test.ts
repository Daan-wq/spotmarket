import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exchangeFbCodeForToken,
  FacebookOAuthError,
  getFacebookAuthUrl,
  REQUIRED_FB_SCOPES,
} from "./facebook";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Facebook OAuth helpers", () => {
  it("requests only the approved production scopes", () => {
    vi.stubEnv("FACEBOOK_APP_ID", "fb-app-id");
    vi.stubEnv("FACEBOOK_REDIRECT_URI", "https://app.test/api/auth/facebook/callback");

    const url = new URL(getFacebookAuthUrl("state-123"));
    const scopes = url.searchParams.get("scope")?.split(",") ?? [];

    expect(scopes).toEqual([
      "public_profile",
      "pages_show_list",
      "pages_read_engagement",
      "pages_read_user_content",
      "read_insights",
    ]);
    expect(REQUIRED_FB_SCOPES).toEqual(scopes);
  });

  it("maps deleted Meta apps to a stable sanitized OAuth detail", async () => {
    vi.stubEnv("FACEBOOK_APP_ID", "fb-app-id");
    vi.stubEnv("FACEBOOK_APP_SECRET", "fb-secret");
    vi.stubEnv("FACEBOOK_REDIRECT_URI", "https://app.test/api/auth/facebook/callback");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "Error validating application. Application has been deleted.",
              type: "OAuthException",
              code: 101,
              fbtrace_id: "trace-123",
            },
          }),
          { status: 400 }
        );
      })
    );

    await expect(exchangeFbCodeForToken("code-123")).rejects.toMatchObject({
      detail: "fb_app_invalid",
      operation: "token_exchange",
      providerError: {
        code: 101,
        errorSubcode: null,
        message: "Error validating application. Application has been deleted.",
        type: "OAuthException",
        fbtraceId: "trace-123",
      },
    } satisfies Partial<FacebookOAuthError>);
  });
});
