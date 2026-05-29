export const CAMPAIGN_REPORT_SECTION_KEYS = [
  "cover",
  "executiveSummary",
  "campaignSetup",
  "performance",
  "financialOverview",
  "platformBreakdown",
  "topContent",
  "contentInsights",
  "creatorPerformance",
  "audience",
  "communityActivation",
  "quality",
  "keyLearnings",
  "nextCampaign",
  "appendix",
] as const;

export type CampaignReportSectionKey = typeof CAMPAIGN_REPORT_SECTION_KEYS[number];
export type CampaignReportStatusValue = "DRAFT" | "FINAL";
export type CampaignReportSectionSettings = Record<CampaignReportSectionKey, boolean>;

export const DEFAULT_CAMPAIGN_REPORT_SECTIONS: CampaignReportSectionSettings = {
  cover: true,
  executiveSummary: true,
  campaignSetup: true,
  performance: true,
  financialOverview: true,
  platformBreakdown: true,
  topContent: true,
  contentInsights: true,
  creatorPerformance: true,
  audience: true,
  communityActivation: false,
  quality: true,
  keyLearnings: true,
  nextCampaign: true,
  appendix: false,
};

export interface CampaignReportEditorialContent {
  campaignType: string;
  financialNote: string;
  contentInsights: string[];
  topContentNotes: Record<string, string>;
  platformRecommendations: Record<string, string>;
  creatorRecommendations: string[];
  qualityNote: string;
  keyLearnings: string[];
  nextCampaignPlan: string[];
  appendixNote: string;
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

export function createEmptyEditorialContent(): CampaignReportEditorialContent {
  return {
    campaignType: "",
    financialNote: "",
    contentInsights: [],
    topContentNotes: {},
    platformRecommendations: {},
    creatorRecommendations: [],
    qualityNote: "",
    keyLearnings: [],
    nextCampaignPlan: [],
    appendixNote: "",
  };
}

export function normalizeEditorialContent(value: unknown): CampaignReportEditorialContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createEmptyEditorialContent();
  const input = value as Record<string, unknown>;
  return {
    campaignType: normalizeText(input.campaignType, 120),
    financialNote: normalizeText(input.financialNote, 1200),
    contentInsights: normalizeTextList(input.contentInsights),
    topContentNotes: normalizeStringRecord(input.topContentNotes, 500),
    platformRecommendations: normalizeStringRecord(input.platformRecommendations, 500),
    creatorRecommendations: normalizeTextList(input.creatorRecommendations),
    qualityNote: normalizeText(input.qualityNote, 1200),
    keyLearnings: normalizeTextList(input.keyLearnings),
    nextCampaignPlan: normalizeTextList(input.nextCampaignPlan),
    appendixNote: normalizeText(input.appendixNote, 2000),
  };
}

export function mergeEditorialContent(
  base: CampaignReportEditorialContent,
  override: unknown,
): CampaignReportEditorialContent {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  const input = override as Record<string, unknown>;
  const normalized = normalizeEditorialContent(override);
  return {
    campaignType: "campaignType" in input ? normalized.campaignType : base.campaignType,
    financialNote: "financialNote" in input ? normalized.financialNote : base.financialNote,
    contentInsights: "contentInsights" in input ? normalized.contentInsights : base.contentInsights,
    topContentNotes: "topContentNotes" in input ? normalized.topContentNotes : base.topContentNotes,
    platformRecommendations: "platformRecommendations" in input
      ? normalized.platformRecommendations
      : base.platformRecommendations,
    creatorRecommendations: "creatorRecommendations" in input
      ? normalized.creatorRecommendations
      : base.creatorRecommendations,
    qualityNote: "qualityNote" in input ? normalized.qualityNote : base.qualityNote,
    keyLearnings: "keyLearnings" in input ? normalized.keyLearnings : base.keyLearnings,
    nextCampaignPlan: "nextCampaignPlan" in input ? normalized.nextCampaignPlan : base.nextCampaignPlan,
    appendixNote: "appendixNote" in input ? normalized.appendixNote : base.appendixNote,
  };
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeStringRecord(value: unknown, maxValueLength: number): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, item]) => {
    const normalizedKey = key.trim().slice(0, 120);
    const normalizedValue = normalizeText(item, maxValueLength);
    if (normalizedKey && normalizedValue) acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
}
