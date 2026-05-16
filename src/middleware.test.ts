import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null } }),
    },
  })),
}));

describe("middleware canonical app domain", () => {
  it("permanently redirects app.clipprofit.nl to app.clipprofit.com preserving path and query", async () => {
    const response = await middleware(
      new NextRequest("https://app.clipprofit.nl/creator/connections?x=1")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.clipprofit.com/creator/connections?x=1"
    );
  });
});
