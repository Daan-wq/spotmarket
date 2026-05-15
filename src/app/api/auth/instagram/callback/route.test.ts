import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function callbackRequest(url: string) {
  return new NextRequest(url);
}

describe("GET /api/auth/instagram/callback", () => {
  it("redirects denied OAuth responses to creator connections", async () => {
    const response = await GET(
      callbackRequest("https://app.test/api/auth/instagram/callback?error=access_denied"),
    );

    expect(response.headers.get("location")).toBe("https://app.test/creator/connections?error=ig_denied");
  });

  it("redirects missing OAuth params to creator connections", async () => {
    const response = await GET(
      callbackRequest("https://app.test/api/auth/instagram/callback"),
    );

    expect(response.headers.get("location")).toBe("https://app.test/creator/connections?error=ig_failed");
  });
});
