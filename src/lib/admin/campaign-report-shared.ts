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

export const DEFAULT_AUDIENCE_INSIGHT_TEMPLATE =
  "Demografische data is gebaseerd op beschikbare accountdata van {{audience.platformsLabel}}. De beschikbaarheid kan per platform en account verschillen.";

const LEGACY_AUDIENCE_INSIGHT_TEMPLATES = new Set([
  "Publieksdata is gebaseerd op beschikbare platformdata. De beschikbaarheid kan per platform verschillen.",
  "Publieksdata is gebaseerd op beschikbare platformdata. Beschikbaarheid kan per platform verschillen.",
]);

export interface CampaignReportEditorialContent {
  templateBlocks: Record<string, string>;
  contentPatternTags: string[];
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
  coverImageUrl: string | null;
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
    const aliases = LEGACY_SECTION_ALIASES[key] ?? [];
    const legacyKey = aliases.find((alias) => typeof input[alias] === "boolean");
    acc[key] = typeof input[key] === "boolean"
      ? Boolean(input[key])
      : legacyKey
        ? Boolean(input[legacyKey])
        : DEFAULT_CAMPAIGN_REPORT_SECTIONS[key];
    return acc;
  }, {} as CampaignReportSectionSettings);
}

export function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 12);
}

export function createEmptyEditorialContent(): CampaignReportEditorialContent {
  return {
    templateBlocks: {},
    contentPatternTags: [],
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
    coverImageUrl: null,
  };
}

export function normalizeEditorialContent(value: unknown): CampaignReportEditorialContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createEmptyEditorialContent();
  const input = value as Record<string, unknown>;
  return {
    templateBlocks: normalizeTemplateBlocks(input.templateBlocks),
    contentPatternTags: normalizeTextList(input.contentPatternTags),
    campaignType: normalizeText(input.campaignType, 120),
    financialNote: normalizeText(input.financialNote, 1200),
    contentInsights: normalizeTextList(input.contentInsights),
    topContentNotes: normalizeStringRecord(input.topContentNotes, 500),
    platformRecommendations: normalizeStringRecord(input.platformRecommendations, 500),
    creatorRecommendations: normalizeTextList(input.creatorRecommendations),
    qualityNote: normalizeText(input.qualityNote, 1200),
    keyLearnings: normalizeTextList(input.keyLearnings),
    nextCampaignPlan: Array.isArray(input.nextCampaignPlan)
      ? normalizeTextList(input.nextCampaignPlan)
      : normalizeTextList(typeof input.nextCampaignPlan === "string" ? [input.nextCampaignPlan] : []),
    appendixNote: normalizeText(input.appendixNote, 2000),
    coverImageUrl: normalizeOptionalUrl(input.coverImageUrl),
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
    templateBlocks: "templateBlocks" in input ? normalized.templateBlocks : base.templateBlocks,
    contentPatternTags: "contentPatternTags" in input ? normalized.contentPatternTags : base.contentPatternTags,
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
    coverImageUrl: "coverImageUrl" in input ? normalized.coverImageUrl : base.coverImageUrl,
  };
}

const LEGACY_SECTION_ALIASES: Partial<Record<CampaignReportSectionKey, string[]>> = {
  campaignAtAGlance: ["campaignSetup"],
  campaignPerformance: ["performance"],
  contentPerformance: ["topContent", "contentInsights"],
  platformPerformance: ["platformBreakdown"],
  creatorContribution: ["creatorPerformance"],
  audienceReach: ["audience"],
  budgetValue: ["financialOverview"],
  qualityAssurance: ["quality"],
  nextCampaign: ["keyLearnings"],
  appendix: ["rawData"],
};

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

function normalizeTemplateBlocks(value: unknown): Record<string, string> {
  const records = normalizeStringRecord(value, 5000);
  if (LEGACY_AUDIENCE_INSIGHT_TEMPLATES.has(records["audience.insight"] ?? "")) {
    records["audience.insight"] = DEFAULT_AUDIENCE_INSIGHT_TEMPLATE;
  }
  return records;
}

function normalizeOptionalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
