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
});
