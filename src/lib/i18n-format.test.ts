import { describe, expect, it } from "vitest";
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatShortDate,
} from "./i18n-format";

describe("locale formatting", () => {
  const date = new Date("2026-05-17T12:00:00Z");

  it("formats currency for English and Dutch", () => {
    expect(formatCurrency(1234.5, "en")).toBe("$1,234.50");
    expect(formatCurrency(1234.5, "nl")).toBe("US$ 1.234,50");
  });

  it("formats numbers and compact numbers for English and Dutch", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
    expect(formatNumber(1234567, "nl")).toBe("1.234.567");
    expect(formatCompactNumber(1200, "en")).toBe("1.2K");
    expect(formatCompactNumber(1200, "nl")).toBe("1,2K");
  });

  it("formats dates for English and Dutch", () => {
    expect(formatDate(date, "en")).toBe("May 17, 2026");
    expect(formatDate(date, "nl")).toBe("17 mei 2026");
    expect(formatShortDate(date, "en")).toBe("May 17, 2026");
    expect(formatShortDate(date, "nl")).toBe("17 mei 2026");
  });

  it("formats percentages and relative time for English and Dutch", () => {
    expect(formatPercent(0.1234, "en")).toBe("12.34%");
    expect(formatPercent(0.1234, "nl")).toBe("12,34%");
    expect(formatRelativeTime(date, "en", new Date("2026-05-18T12:00:00Z"))).toBe("yesterday");
    expect(formatRelativeTime(date, "nl", new Date("2026-05-18T12:00:00Z"))).toBe("gisteren");
  });
});
