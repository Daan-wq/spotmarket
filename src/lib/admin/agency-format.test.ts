import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatNumber, formatShortDate } from "./agency-format";

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, " ");
}

describe("agency locale formatting", () => {
  it("formats English currency, numbers, and dates by default", () => {
    const date = new Date("2026-05-17T12:00:00Z");

    expect(formatCurrency(1234.56)).toBe("\u20ac1,235");
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatDate(date)).toBe("May 17, 2026");
    expect(formatShortDate(date)).toBe("May 17");
  });

  it("formats Dutch currency, numbers, and dates with nl-NL conventions", () => {
    const date = new Date("2026-05-17T12:00:00Z");

    expect(normalizeSpaces(formatCurrency(1234.56, "EUR", "nl"))).toBe("\u20ac 1.235");
    expect(formatNumber(1234567, "nl")).toBe("1.234.567");
    expect(formatDate(date, "nl")).toBe("17 mei 2026");
    expect(formatShortDate(date, "nl")).toBe("17 mei");
  });
});
