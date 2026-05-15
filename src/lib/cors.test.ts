import { describe, expect, it } from "vitest";
import { corsHeaders, validateCors } from "./cors";

describe("cors", () => {
  it("allows the Dutch app origin", () => {
    const req = new Request("https://app.clipprofit.nl/api/example", {
      headers: { origin: "https://app.clipprofit.nl" },
    });

    expect(validateCors(req)).toBeNull();
    expect(corsHeaders("https://app.clipprofit.nl")["Access-Control-Allow-Origin"]).toBe(
      "https://app.clipprofit.nl"
    );
  });

  it("allows the English app origin", () => {
    const req = new Request("https://app.clipprofit.com/api/example", {
      headers: { origin: "https://app.clipprofit.com" },
    });

    expect(validateCors(req)).toBeNull();
  });

  it("rejects unknown origins", async () => {
    const req = new Request("https://app.clipprofit.nl/api/example", {
      headers: { origin: "https://example.com" },
    });
    const res = validateCors(req);

    expect(res?.status).toBe(403);
    await expect(res?.json()).resolves.toEqual({ error: "Forbidden" });
  });
});
