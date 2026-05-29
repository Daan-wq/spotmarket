import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatNumber, formatShortDate } from "./agency-format";

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, " ");
}

describe("agency locale formatting", () => {
  it("formats Dutch currency, numbers, and dates by default", () => {
    const date = new Date("2026-05-17T12:00:00Z");

    expect(normalizeSpaces(formatCurrency(1234.56))).toBe("\u20ac 1.234,56");
    expect(formatNumber(1234567)).toBe("1.234.567");
    expect(formatDate(date)).toBe("17 mei 2026");
    expect(formatShortDate(date)).toBe("17 mei");
  });

  it("keeps English formatting available when explicitly requested", () => {
    const date = new Date("2026-05-17T12:00:00Z");

    expect(formatCurrency(1234.56, "EUR", "en")).toBe("\u20ac1,234.56");
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
    expect(formatDate(date, "en")).toBe("May 17, 2026");
    expect(formatShortDate(date, "en")).toBe("May 17");
  });
});
