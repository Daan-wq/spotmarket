import { describe, expect, it } from "vitest";
import { contractDocumentSchema, pricingPackageSchema, weeklySnapshotSchema } from "./final-remediation-validation";

describe("final remediation validation", () => {
  it("accepts a complete pricing package template", () => {
    const parsed = pricingPackageSchema.parse({
      name: "Starter launch",
      price: "2500",
      currency: "EUR",
      platforms: ["INSTAGRAM", "TIKTOK"],
      includedClips: "20",
      includedViews: "500000",
      creatorRatePerClip: "35",
      businessCpv: "0.008",
      marginPercent: "35",
    });

    expect(parsed.price).toBe(2500);
    expect(parsed.platforms).toEqual(["INSTAGRAM", "TIKTOK"]);
  });

  it("accepts document tracker metadata with renewal dates", () => {
    const parsed = contractDocumentSchema.parse({
      title: "Service agreement",
      status: "ACTIVE",
      owner: "Operations",
      renewalAt: "2026-06-01",
      externalUrl: "https://example.com/contract",
    });

    expect(parsed.renewalAt).toBeInstanceOf(Date);
    expect(parsed.externalUrl).toBe("https://example.com/contract");
  });

  it("requires a weekly number snapshot window", () => {
    const result = weeklySnapshotSchema.safeParse({ notes: "Missing dates" });

    expect(result.success).toBe(false);
  });
});
