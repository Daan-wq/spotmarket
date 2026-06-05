import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null } }),
    },
  })),
}));

describe("proxy canonical app domain", () => {
  it("permanently redirects app.clipprofit.nl to app.clipprofit.com preserving path and query", async () => {
    const response = await proxy(
      new NextRequest("https://app.clipprofit.nl/creator/connections?x=1")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.clipprofit.com/creator/connections?x=1"
    );
  });

  it("defaults app.clipprofit.com requests to Dutch", async () => {
    const response = await proxy(new NextRequest("https://app.clipprofit.com/sign-in"));

    expect(response.headers.get("content-language")).toBe("nl");
    expect(response.headers.get("x-locale")).toBe("nl");
    expect(response.headers.get("set-cookie")).toContain("NEXT_LOCALE=nl");
  });

  it("preserves an explicit English preference", async () => {
    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/sign-in", {
        headers: { cookie: "NEXT_LOCALE=en" },
      })
    );

    expect(response.headers.get("content-language")).toBe("en");
    expect(response.headers.get("x-locale")).toBe("en");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("keeps password recovery confirmation public without consuming its token", async () => {
    const response = await proxy(
      new NextRequest(
        "https://app.clipprofit.com/auth/recovery?token_hash=recovery-token",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
