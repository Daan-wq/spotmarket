import { describe, expect, it, vi } from "vitest";
import { getFacebookAuthUrl, REQUIRED_FB_SCOPES } from "./facebook";

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
});
