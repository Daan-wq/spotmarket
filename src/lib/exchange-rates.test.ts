import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_EUR_USD_RATE,
  FRANKFURTER_EUR_USD_URL,
  getEurUsdRate,
  parseFrankfurterEurUsdRate,
} from "./exchange-rates";

describe("EUR to USD exchange rates", () => {
  it("parses a Frankfurter EUR/USD rate response", () => {
    expect(
      parseFrankfurterEurUsdRate({
        date: "2026-05-30",
        base: "EUR",
        quote: "USD",
        rate: 1.1655,
      }),
    ).toEqual({
      date: "2026-05-30",
      rate: 1.1655,
      source: "Frankfurter",
    });
  });

  it("fetches the latest EUR/USD rate with Next revalidation", async () => {
    const fetchRate = vi.fn(async () =>
      new Response(
        JSON.stringify({
          date: "2026-05-30",
          base: "EUR",
          quote: "USD",
          rate: 1.1655,
        }),
      ),
    );

    await expect(getEurUsdRate(fetchRate as unknown as typeof fetch)).resolves.toEqual({
      date: "2026-05-30",
      rate: 1.1655,
      source: "Frankfurter",
    });
    expect(fetchRate).toHaveBeenCalledWith(
      FRANKFURTER_EUR_USD_URL,
      expect.objectContaining({
        next: { revalidate: 3600 },
      }),
    );
  });

  it("falls back when Frankfurter cannot return a usable rate", async () => {
    const fetchRate = vi.fn(async () => new Response("nope", { status: 500 }));

    await expect(getEurUsdRate(fetchRate as unknown as typeof fetch)).resolves.toEqual(
      FALLBACK_EUR_USD_RATE,
    );
  });
});
