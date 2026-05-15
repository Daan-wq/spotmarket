import { describe, expect, it } from "vitest";
import {
  buildCampaignEditPayload,
  cpmPerMToCpv,
  cpvToCpmPerM,
  emptyToNull,
  parseLines,
  type CampaignEditFormState,
} from "./campaign-edit";

const baseState: CampaignEditFormState = {
  name: "  New campaign  ",
  status: "active",
  brandId: "",
  pricingTemplateId: "pkg_123",
  platforms: ["TIKTOK", "INSTAGRAM"],
  niche: "CASINO",
  description: "",
  contentType: "Clips",
  contentGuidelines: "Use the CTA",
  requirements: "Logo visible",
  otherNotes: "",
  pageStats: "{\"minFollowers\":\"10k\"}",
  minAge: "25+",
  referralLink: "",
  bannerUrl: "https://example.com/banner.png",
  bannerVideoUrl: "",
  briefAssetUrl: "https://example.com/brief.pdf",
  guidelinesUrl: "",
  contentAssetUrlsText: "https://example.com/a.png\n\nhttps://example.com/b.mp4",
  requiredHashtagsText: "#clipprofit\n#casino",
  targetCountry: "US",
  targetCountryPercent: "65",
  targetMinAge18Percent: "",
  targetMalePercent: "70",
  minFollowers: "",
  minEngagementRate: "2.5",
  bioRequirement: "",
  linkInBioRequired: "Required during campaign",
  totalBudget: "10000",
  goalViews: "5000000",
  creatorCpmPerM: "35",
  adminMarginPerM: "10",
  deadline: "2026-06-01",
  startsAt: "",
  maxSlots: "",
  requiresApproval: true,
};

describe("campaign edit helpers", () => {
  it("converts CPM per million views to CPV and back", () => {
    expect(cpmPerMToCpv(35)).toBe(0.000035);
    expect(cpvToCpmPerM("0.000035")).toBe(35);
  });

  it("parses newline-delimited arrays", () => {
    expect(parseLines(" one \n\n two\r\n three ")).toEqual(["one", "two", "three"]);
  });

  it("normalizes empty strings to null", () => {
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull(" value ")).toBe("value");
  });

  it("builds the editable campaign payload", () => {
    const payload = buildCampaignEditPayload(baseState);

    expect(payload).toMatchObject({
      name: "New campaign",
      brandId: null,
      pricingTemplateId: "pkg_123",
      description: null,
      contentAssetUrls: ["https://example.com/a.png", "https://example.com/b.mp4"],
      requiredHashtags: ["#clipprofit", "#casino"],
      targetCountryPercent: 65,
      targetMinAge18Percent: null,
      minFollowers: 0,
      minEngagementRate: 2.5,
      totalBudget: 10000,
      goalViews: 5000000,
      creatorCpmPerM: 35,
      adminMarginPerM: 10,
      startsAt: null,
      maxSlots: null,
    });
    expect(payload.deadline).toBe(new Date("2026-06-01").toISOString());
  });
});
