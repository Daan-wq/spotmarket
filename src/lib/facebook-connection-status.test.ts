import { describe, expect, it } from "vitest";
import { getFacebookConnectionStatus } from "./facebook-connection-status";

describe("getFacebookConnectionStatus", () => {
  it("returns a success status for linked Facebook redirects", () => {
    expect(getFacebookConnectionStatus({ facebook: "linked" })).toEqual({
      tone: "success",
      key: "linked",
    });
  });

  it("maps sanitized Facebook OAuth details to creator-facing status keys", () => {
    expect(
      getFacebookConnectionStatus({ error: "fb_error", detail: "fb_app_invalid" })
    ).toEqual({
      tone: "error",
      key: "appInvalid",
    });

    expect(
      getFacebookConnectionStatus({ error: "fb_error", detail: "fb_redirect_mismatch" })
    ).toEqual({
      tone: "error",
      key: "redirectMismatch",
    });
  });

  it("ignores non-Facebook query params and does not expose raw detail text", () => {
    expect(
      getFacebookConnectionStatus({
        error: "ig_error",
        detail: "Facebook token exchange failed: raw provider JSON",
      })
    ).toBeNull();

    expect(
      getFacebookConnectionStatus({
        error: "fb_error",
        detail: "Facebook token exchange failed: raw provider JSON",
      })
    ).toEqual({
      tone: "error",
      key: "tokenExchangeFailed",
    });
  });
});
