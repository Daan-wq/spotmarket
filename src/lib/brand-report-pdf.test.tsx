import { describe, expect, it } from "vitest";
import type { BrandReportDocumentModel } from "./brand-report-document-model";
import { renderBrandReportPdf, sanitizePdfThumbnailUrl } from "./brand-report-pdf";

const model = {
  title: "Betspecialist campagnerapport",
  brandName: "Betspecialist",
  campaignName: "TikTok campagne",
  period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T00:00:00.000Z" },
  generatedAt: "2026-06-11T00:00:00.000Z",
  sections: {},
  cover: { kicker: "Campagne prestatierapport", title: "Betspecialist campagnerapport" },
  summary: {
    kicker: "Samenvatting",
    title: "Resultaat in een oogopslag",
    body: "Niet-opgeslagen redactie verschijnt in deze PDF.",
    takeaways: ["Veel bereik voor hetzelfde budget."],
  },
  result: {
    kicker: "Campagne in het kort",
    title: "Doel, bereik en overdelivery",
    currentViews: 2_000_000,
    targetViews: 1_250_000,
    paidViews: 1_250_000,
    extraReach: 750_000,
    approvedClips: 69,
    budgetUsed: 1000,
    budgetUsedPercent: 1,
  },
  metrics: {
    currentViews: 2_000_000,
    targetViews: 1_250_000,
    approvedClips: 69,
    uniquePages: 12,
    totalEngagement: 200_000,
  },
  cpm: {
    agreed: 0.8,
    effective: 0.5,
    explanation: "De effectieve CPM laat zien wat je werkelijk betaalt.",
  },
  performance: null,
  platforms: {
    kicker: "Platformprestaties",
    title: "Kanaalvergelijking",
    rows: [{
      platform: "TikTok",
      views: 2_000_000,
      clips: 69,
      engagement: 200_000,
      cost: 1000,
      averageViewsPerClip: 28_985,
      effectiveCpv: 0.0005,
      effectiveCpm: 0.5,
      engagementRate: 0.1,
      agreedCpm: 0.8,
      recommendation: "",
    }],
  },
  content: null,
  creators: null,
  audience: null,
  budget: null,
  quality: {
    reviewedClips: 73,
    excludedClips: 4,
    excludedViews: 2500,
  },
  recommendations: null,
  appendix: null,
} as unknown as BrandReportDocumentModel;

describe("renderBrandReportPdf", () => {
  it("renders a selectable direct A4 PDF buffer", async () => {
    const buffer = await renderBrandReportPdf(model);
    const source = buffer.toString("latin1");

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
    expect(source).toContain("/MediaBox [0 0 595.280029 841.890015]");
    expect(source).toContain("/BaseFont /Helvetica");
  });

  it("loads thumbnails only from the configured Supabase host or explicit CDN hosts", () => {
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousAllowedHosts = process.env.REPORT_PDF_ALLOWED_IMAGE_HOSTS;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.REPORT_PDF_ALLOWED_IMAGE_HOSTS = "cdn.example.com";

    expect(sanitizePdfThumbnailUrl("https://project.supabase.co/storage/v1/object/public/clip.jpg"))
      .toBe("https://project.supabase.co/storage/v1/object/public/clip.jpg");
    expect(sanitizePdfThumbnailUrl("https://cdn.example.com/clip.jpg"))
      .toBe("https://cdn.example.com/clip.jpg");
    expect(sanitizePdfThumbnailUrl("https://untrusted.example/clip.jpg")).toBeNull();
    expect(sanitizePdfThumbnailUrl("http://project.supabase.co/clip.jpg")).toBeNull();

    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    if (previousAllowedHosts === undefined) delete process.env.REPORT_PDF_ALLOWED_IMAGE_HOSTS;
    else process.env.REPORT_PDF_ALLOWED_IMAGE_HOSTS = previousAllowedHosts;
  });
});
