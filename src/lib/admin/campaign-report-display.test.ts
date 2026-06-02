import { describe, expect, it } from "vitest";
import {
  formatAudienceCountryLabel,
  formatAudienceShare,
  reportQualityStatusLabel,
} from "@/lib/admin/campaign-report-display";
import { normalizeEditorialContent } from "@/lib/admin/campaign-report-shared";

describe("campaign report display helpers", () => {
  it("formats audience countries as Dutch full names", () => {
    expect(formatAudienceCountryLabel("nl")).toBe("Nederland");
    expect(formatAudienceCountryLabel("in")).toBe("India");
    expect(formatAudienceCountryLabel("us")).toBe("Verenigde Staten");
  });

  it("formats audience percentages with two decimals", () => {
    expect(formatAudienceShare(2.562)).toBe("2,56%");
    expect(formatAudienceShare(0.128)).toBe("0,13%");
  });

  it("uses Dutch brand-safe quality status labels", () => {
    expect(reportQualityStatusLabel("passed")).toBe("Gecontroleerd");
    expect(reportQualityStatusLabel("passed_with_exclusions")).toBe("Gecontroleerd met uitsluitingen");
    expect(reportQualityStatusLabel("needs_attention")).toBe("Aandacht nodig");
  });

  it("normalizes report cover images in editorial content", () => {
    expect(normalizeEditorialContent({ coverImageUrl: "https://example.com/cover.jpg" }).coverImageUrl).toBe("https://example.com/cover.jpg");
    expect(normalizeEditorialContent({ coverImageUrl: "javascript:alert(1)" }).coverImageUrl).toBeNull();
    expect(normalizeEditorialContent({}).coverImageUrl).toBeNull();
  });
});
