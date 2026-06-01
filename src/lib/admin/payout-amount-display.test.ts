import { describe, expect, it } from "vitest";
import { formatAdminPayoutAmount } from "./payout-amount-display";

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, " ");
}

const eurUsdRate = {
  date: "2026-05-30",
  rate: 1.1655,
  source: "Frankfurter" as const,
};

describe("admin payout amount display", () => {
  it("shows crypto payout amounts as USD with EUR/rate metadata", () => {
    const display = formatAdminPayoutAmount({
      amount: "25.50",
      currency: "EUR",
      paymentMethod: "CRYPTO",
      eurUsdRate,
    });

    expect(display.primary).toBe("$29.72");
    expect(normalizeSpaces(display.secondary ?? "")).toBe("€ 25,50 EUR");
    expect(display.rateLabel).toBe("1 EUR = 1.1655 USD · Frankfurter 2026-05-30");
  });

  it("keeps bank payout amounts in their stored currency", () => {
    const display = formatAdminPayoutAmount({
      amount: "25.50",
      currency: "EUR",
      paymentMethod: "BANK_TRANSFER",
      eurUsdRate,
    });

    expect(normalizeSpaces(display.primary)).toBe("€ 25,50");
    expect(display.secondary).toBeUndefined();
    expect(display.rateLabel).toBeUndefined();
  });
});
