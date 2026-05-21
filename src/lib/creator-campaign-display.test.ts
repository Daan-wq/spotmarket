import { describe, expect, it } from "vitest";
import {
  buildCreatorCampaignConfigSections,
  type CreatorCampaignDisplayLabels,
} from "./creator-campaign-display";

const labels: CreatorCampaignDisplayLabels = {
  briefTitle: "Brief and requirements",
  resourcesTitle: "Resources",
  targetingTitle: "Targeting",
  timelineTitle: "Timeline and limits",
  description: "Description",
  contentType: "Content type",
  requirements: "Requirements",
  contentGuidelines: "Content guidelines",
  otherNotes: "Other notes",
  pageStats: "Page stats",
  minimumAge: "Minimum age",
  requiredHashtags: "Required hashtags",
  trackingLink: "Tracking link",
  bannerImage: "Banner image",
  bannerVideo: "Banner video",
  briefAsset: "Brief asset",
  guidelines: "Guidelines",
  contentAsset: (index) => `Content asset ${index}`,
  targetCountry: "Target country",
  targetCountryAudience: "Target country audience",
  target18Audience: "Target 18+ audience",
  targetMaleAudience: "Target male audience",
  minimumFollowers: "Minimum followers",
  minimumEngagementRate: "Minimum engagement rate",
  bioRequirement: "Bio requirement",
  linkInBioRequirement: "Link in bio requirement",
  goalViews: "Goal views",
  startDate: "Start date",
  deadline: "Deadline",
  accountLimit: "Account limit",
  approvalRequired: "Approval required",
  yes: "Yes",
  pageStatsLabels: {
    minFollowers: "Minimum followers",
    malePercent: "Male audience",
  },
};

const formatters = {
  number: (value: number) => value.toLocaleString("en-US"),
  percent: (value: number) => `${value}%`,
  date: (value: Date | string) =>
    new Date(value).toISOString().slice(0, 10),
};

describe("buildCreatorCampaignConfigSections", () => {
  it("includes non-empty creator-relevant admin fields grouped by purpose", () => {
    const sections = buildCreatorCampaignConfigSections(
      {
        description: "Make a product clip",
        contentType: "UGC clips",
        requirements: "#bramsfruit\nMention the shirt",
        contentGuidelines: "Use drive assets",
        otherNotes: "Netherlands",
        pageStats: JSON.stringify({
          minFollowers: "10k",
          malePercent: "60%",
        }),
        minAge: "25+",
        requiredHashtags: ["#bramsfruit"],
        referralLink: "https://example.com/ref",
        bannerUrl: "https://example.com/banner.png",
        bannerVideoUrl: "https://example.com/banner.mp4",
        briefAssetUrl: "https://example.com/brief.pdf",
        guidelinesUrl: "https://example.com/guidelines",
        contentAssetUrls: [
          "https://drive.google.com/drive/folders/1l-EUhsHUs7qwHDF30pmz9oXUCytm4EqL",
        ],
        targetCountry: "US",
        targetCountryPercent: 65,
        targetMinAge18Percent: 80,
        targetMalePercent: 70,
        minFollowers: 5000,
        minEngagementRate: "2.5",
        bioRequirement: "Mention Brams Fruit",
        linkInBioRequired: "Add tracking link",
        goalViews: 5000000,
        startsAt: "2026-05-21T00:00:00.000Z",
        deadline: "2026-05-31T00:00:00.000Z",
        maxSlots: 12,
        requiresApproval: true,
      },
      labels,
      formatters,
    );

    expect(sections.map((section) => section.id)).toEqual([
      "brief",
      "resources",
      "targeting",
      "timeline",
    ]);
    expect(sections.flatMap((section) => section.items)).toEqual(
      expect.arrayContaining([
        { kind: "text", label: "Content type", value: "UGC clips" },
        {
          kind: "multiline",
          label: "Requirements",
          value: "#bramsfruit\nMention the shirt",
        },
        {
          kind: "multiline",
          label: "Page stats",
          value: "Minimum followers: 10k\nMale audience: 60%",
        },
        {
          kind: "link",
          label: "Content asset 1",
          href: "https://drive.google.com/drive/folders/1l-EUhsHUs7qwHDF30pmz9oXUCytm4EqL",
        },
        { kind: "text", label: "Target country", value: "US" },
        { kind: "text", label: "Minimum followers", value: "5,000" },
        { kind: "text", label: "Goal views", value: "5,000,000" },
        { kind: "text", label: "Approval required", value: "Yes" },
      ]),
    );
  });

  it("hides blank, empty, default-zero, and internal admin-only values", () => {
    const sections = buildCreatorCampaignConfigSections(
      {
        description: "  ",
        contentType: null,
        requirements: "",
        contentGuidelines: null,
        otherNotes: undefined,
        pageStats: JSON.stringify({ minFollowers: "" }),
        minAge: "",
        requiredHashtags: [],
        referralLink: null,
        bannerUrl: "",
        bannerVideoUrl: "   ",
        briefAssetUrl: null,
        guidelinesUrl: undefined,
        contentAssetUrls: ["", "   "],
        targetCountry: "",
        targetCountryPercent: null,
        targetMinAge18Percent: undefined,
        targetMalePercent: null,
        minFollowers: 0,
        minEngagementRate: "0",
        bioRequirement: "",
        linkInBioRequired: null,
        goalViews: null,
        startsAt: null,
        deadline: undefined,
        maxSlots: null,
        requiresApproval: false,
        adminMargin: 0.5,
        pricingTemplateId: "pkg_internal",
      },
      labels,
      formatters,
    );

    expect(sections).toEqual([]);
  });
});
