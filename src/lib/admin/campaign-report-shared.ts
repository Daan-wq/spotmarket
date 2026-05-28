export const CAMPAIGN_REPORT_SECTION_KEYS = [
  "cover",
  "executiveSummary",
  "campaignSetup",
  "performance",
  "platformBreakdown",
  "topContent",
  "creatorPerformance",
  "audience",
  "quality",
  "nextCampaign",
] as const;

export type CampaignReportSectionKey = typeof CAMPAIGN_REPORT_SECTION_KEYS[number];
export type CampaignReportStatusValue = "DRAFT" | "FINAL";
export type CampaignReportSectionSettings = Record<CampaignReportSectionKey, boolean>;

export const DEFAULT_CAMPAIGN_REPORT_SECTIONS: CampaignReportSectionSettings = {
  cover: true,
  executiveSummary: true,
  campaignSetup: true,
  performance: true,
  platformBreakdown: true,
  topContent: true,
  creatorPerformance: true,
  audience: true,
  quality: true,
  nextCampaign: true,
};

export interface CampaignReportEditorial {
  title: string;
  executiveSummary: string;
  keyTakeaways: string[];
  learnings: string[];
  nextCampaignRecommendations: string[];
  sectionSettings: CampaignReportSectionSettings;
}

export function normalizeSectionSettings(value: unknown): CampaignReportSectionSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS };
  const input = value as Record<string, unknown>;
  return CAMPAIGN_REPORT_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = typeof input[key] === "boolean" ? Boolean(input[key]) : DEFAULT_CAMPAIGN_REPORT_SECTIONS[key];
    return acc;
  }, {} as CampaignReportSectionSettings);
}

export function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 12);
}
