export const CAMPAIGN_REPORT_SECTION_KEYS = [
  "cover",
  "executiveSummary",
  "campaignAtAGlance",
  "campaignPerformance",
  "contentPerformance",
  "platformPerformance",
  "creatorContribution",
  "audienceReach",
  "budgetValue",
  "qualityAssurance",
  "nextCampaign",
  "appendix",
] as const;

export type CampaignReportSectionKey = typeof CAMPAIGN_REPORT_SECTION_KEYS[number];
export type CampaignReportStatusValue = "DRAFT" | "FINAL";
export type CampaignReportSectionSettings = Record<CampaignReportSectionKey, boolean>;

export const DEFAULT_CAMPAIGN_REPORT_SECTIONS: CampaignReportSectionSettings = {
  cover: true,
  executiveSummary: true,
  campaignAtAGlance: true,
  campaignPerformance: true,
  contentPerformance: true,
  platformPerformance: true,
  creatorContribution: true,
  audienceReach: true,
  budgetValue: true,
  qualityAssurance: true,
  nextCampaign: true,
  appendix: false,
};

export interface CampaignReportEditorialContent {
  templateBlocks: Record<string, string>;
  contentPatternTags: string[];
  topContentNotes: Record<string, string>;
  platformRecommendations: Record<string, string>;
  creatorRecommendations: string[];
  qualityNote: string;
  nextCampaignPlan: string;
}

export interface CampaignReportEditorial {
  title: string;
  executiveSummary: string;
  keyTakeaways: string[];
  learnings: string[];
  nextCampaignRecommendations: string[];
  sectionSettings: CampaignReportSectionSettings;
  editorialContent: CampaignReportEditorialContent;
}

const LEGACY_SECTION_ALIASES: Partial<Record<CampaignReportSectionKey, string[]>> = {
  campaignAtAGlance: ["campaignSetup"],
  campaignPerformance: ["performance"],
  contentPerformance: ["topContent"],
  platformPerformance: ["platformBreakdown"],
  creatorContribution: ["creatorPerformance"],
  audienceReach: ["audience"],
  budgetValue: ["financialOverview"],
  qualityAssurance: ["quality"],
  appendix: ["rawData"],
};

export function normalizeSectionSettings(value: unknown): CampaignReportSectionSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS };
  const input = value as Record<string, unknown>;
  return CAMPAIGN_REPORT_SECTION_KEYS.reduce((acc, key) => {
    const aliases = LEGACY_SECTION_ALIASES[key] ?? [];
    const legacyValue = aliases.find((alias) => typeof input[alias] === "boolean");
    acc[key] = typeof input[key] === "boolean"
      ? Boolean(input[key])
      : legacyValue
        ? Boolean(input[legacyValue])
        : DEFAULT_CAMPAIGN_REPORT_SECTIONS[key];
    return acc;
  }, {} as CampaignReportSectionSettings);
}

export function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 12);
}

export function normalizeEditorialContent(value: unknown): CampaignReportEditorialContent {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    templateBlocks: normalizeTextRecord(input.templateBlocks),
    contentPatternTags: normalizeTextList(input.contentPatternTags),
    topContentNotes: normalizeTextRecord(input.topContentNotes),
    platformRecommendations: normalizeTextRecord(input.platformRecommendations),
    creatorRecommendations: normalizeTextList(input.creatorRecommendations),
    qualityNote: typeof input.qualityNote === "string" ? input.qualityNote : "",
    nextCampaignPlan: typeof input.nextCampaignPlan === "string" ? input.nextCampaignPlan : "",
  };
}

function normalizeTextRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, recordValue]) => [key, String(recordValue ?? "").trim()] as const)
      .filter(([key]) => Boolean(key))
      .slice(0, 250),
  );
}
