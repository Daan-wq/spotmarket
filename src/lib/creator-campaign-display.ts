export type CreatorCampaignConfigSectionId =
  | "brief"
  | "resources"
  | "targeting"
  | "timeline";

export type CreatorCampaignConfigItem =
  | { kind: "text"; label: string; value: string }
  | { kind: "multiline"; label: string; value: string }
  | { kind: "link"; label: string; href: string };

export interface CreatorCampaignConfigSection {
  id: CreatorCampaignConfigSectionId;
  title: string;
  items: CreatorCampaignConfigItem[];
}

export interface CreatorCampaignDisplayLabels {
  briefTitle: string;
  resourcesTitle: string;
  targetingTitle: string;
  timelineTitle: string;
  description: string;
  contentType: string;
  requirements: string;
  contentGuidelines: string;
  otherNotes: string;
  pageStats: string;
  minimumAge: string;
  requiredHashtags: string;
  trackingLink: string;
  bannerImage: string;
  bannerVideo: string;
  briefAsset: string;
  guidelines: string;
  contentAsset: (index: number) => string;
  targetCountry: string;
  targetCountryAudience: string;
  target18Audience: string;
  targetMaleAudience: string;
  minimumFollowers: string;
  minimumEngagementRate: string;
  bioRequirement: string;
  linkInBioRequirement: string;
  goalViews: string;
  minimumPaidViews: string;
  maximumPaidViews: string;
  startDate: string;
  deadline: string;
  accountLimit: string;
  approvalRequired: string;
  yes: string;
  pageStatsLabels: Record<string, string>;
}

export interface CreatorCampaignDisplayFormatters {
  number: (value: number) => string;
  percent: (value: number) => string;
  date: (value: Date | string) => string;
}

type NumericDisplayValue = number | bigint | string | { toString(): string };

export interface CreatorCampaignDisplayInput {
  [key: string]: unknown;
  description?: string | null;
  contentType?: string | null;
  contentGuidelines?: string | null;
  requirements?: string | null;
  otherNotes?: string | null;
  pageStats?: string | null;
  minAge?: string | null;
  referralLink?: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  briefAssetUrl?: string | null;
  guidelinesUrl?: string | null;
  contentAssetUrls?: readonly string[] | null;
  requiredHashtags?: readonly string[] | null;
  targetCountry?: string | null;
  targetCountryPercent?: number | null;
  targetMinAge18Percent?: number | null;
  targetMalePercent?: number | null;
  minFollowers?: number | null;
  minEngagementRate?: NumericDisplayValue | null;
  bioRequirement?: string | null;
  linkInBioRequired?: string | null;
  goalViews?: NumericDisplayValue | null;
  minimumPaidViews?: NumericDisplayValue | null;
  maximumPaidViews?: NumericDisplayValue | null;
  startsAt?: Date | string | null;
  deadline?: Date | string | null;
  maxSlots?: number | null;
  requiresApproval?: boolean | null;
}

export function buildCreatorCampaignConfigSections(
  campaign: CreatorCampaignDisplayInput,
  labels: CreatorCampaignDisplayLabels,
  formatters: CreatorCampaignDisplayFormatters,
): CreatorCampaignConfigSection[] {
  const briefItems: CreatorCampaignConfigItem[] = [];
  addText(briefItems, labels.contentType, campaign.contentType);
  addMultiline(briefItems, labels.description, campaign.description);
  addMultiline(briefItems, labels.requirements, campaign.requirements);
  addMultiline(briefItems, labels.contentGuidelines, campaign.contentGuidelines);
  addMultiline(briefItems, labels.otherNotes, campaign.otherNotes);
  addMultiline(
    briefItems,
    labels.pageStats,
    formatPageStats(campaign.pageStats, labels.pageStatsLabels),
  );
  addText(briefItems, labels.minimumAge, campaign.minAge);
  addText(
    briefItems,
    labels.requiredHashtags,
    cleanList(campaign.requiredHashtags).join(", "),
  );

  const resourceItems: CreatorCampaignConfigItem[] = [];
  addLink(resourceItems, labels.trackingLink, campaign.referralLink);
  addLink(resourceItems, labels.bannerImage, campaign.bannerUrl);
  addLink(resourceItems, labels.bannerVideo, campaign.bannerVideoUrl);
  addLink(resourceItems, labels.briefAsset, campaign.briefAssetUrl);
  addLink(resourceItems, labels.guidelines, campaign.guidelinesUrl);
  cleanList(campaign.contentAssetUrls).forEach((href, index) => {
    addLink(resourceItems, labels.contentAsset(index + 1), href);
  });

  const targetingItems: CreatorCampaignConfigItem[] = [];
  addText(targetingItems, labels.targetCountry, campaign.targetCountry);
  addText(
    targetingItems,
    labels.targetCountryAudience,
    formatPercent(campaign.targetCountryPercent, formatters),
  );
  addText(
    targetingItems,
    labels.target18Audience,
    formatPercent(campaign.targetMinAge18Percent, formatters),
  );
  addText(
    targetingItems,
    labels.targetMaleAudience,
    formatPercent(campaign.targetMalePercent, formatters),
  );
  addText(
    targetingItems,
    labels.minimumFollowers,
    formatPositiveNumber(campaign.minFollowers, formatters),
  );
  addText(
    targetingItems,
    labels.minimumEngagementRate,
    formatPositivePercent(campaign.minEngagementRate, formatters),
  );
  addText(targetingItems, labels.bioRequirement, campaign.bioRequirement);
  addText(
    targetingItems,
    labels.linkInBioRequirement,
    campaign.linkInBioRequired,
  );

  const timelineItems: CreatorCampaignConfigItem[] = [];
  addText(
    timelineItems,
    labels.goalViews,
    formatPositiveNumber(campaign.goalViews, formatters),
  );
  addText(
    timelineItems,
    labels.minimumPaidViews,
    formatPositiveNumber(campaign.minimumPaidViews, formatters),
  );
  addText(
    timelineItems,
    labels.maximumPaidViews,
    formatPositiveNumber(campaign.maximumPaidViews, formatters),
  );
  addText(
    timelineItems,
    labels.accountLimit,
    formatPositiveNumber(campaign.maxSlots, formatters),
  );
  addText(timelineItems, labels.startDate, formatDate(campaign.startsAt, formatters));
  addText(timelineItems, labels.deadline, formatDate(campaign.deadline, formatters));
  if (campaign.requiresApproval) {
    timelineItems.push({
      kind: "text",
      label: labels.approvalRequired,
      value: labels.yes,
    });
  }

  const sections: CreatorCampaignConfigSection[] = [
    { id: "brief", title: labels.briefTitle, items: briefItems },
    { id: "resources", title: labels.resourcesTitle, items: resourceItems },
    { id: "targeting", title: labels.targetingTitle, items: targetingItems },
    { id: "timeline", title: labels.timelineTitle, items: timelineItems },
  ];

  return sections.filter((section) => section.items.length > 0);
}

function addText(
  items: CreatorCampaignConfigItem[],
  label: string,
  value: string | null | undefined,
) {
  const cleaned = cleanText(value);
  if (!cleaned) return;
  items.push({ kind: "text", label, value: cleaned });
}

function addMultiline(
  items: CreatorCampaignConfigItem[],
  label: string,
  value: string | null | undefined,
) {
  const cleaned = cleanText(value);
  if (!cleaned) return;
  items.push({ kind: "multiline", label, value: cleaned });
}

function addLink(
  items: CreatorCampaignConfigItem[],
  label: string,
  href: string | null | undefined,
) {
  const cleaned = cleanText(href);
  if (!cleaned) return;
  items.push({ kind: "link", label, href: cleaned });
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function cleanList(value: readonly string[] | null | undefined): string[] {
  return (value ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function formatPositiveNumber(
  value: NumericDisplayValue | null | undefined,
  formatters: CreatorCampaignDisplayFormatters,
): string | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return formatters.number(parsed);
}

function formatPercent(
  value: number | null | undefined,
  formatters: CreatorCampaignDisplayFormatters,
): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return formatters.percent(value);
}

function formatPositivePercent(
  value: NumericDisplayValue | null | undefined,
  formatters: CreatorCampaignDisplayFormatters,
): string | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return formatters.percent(parsed);
}

function formatDate(
  value: Date | string | null | undefined,
  formatters: CreatorCampaignDisplayFormatters,
): string | null {
  if (!value) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return formatters.date(value);
}

function formatPageStats(
  value: string | null | undefined,
  labels: Record<string, string>,
): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return cleaned;
    }

    const entries = Object.entries(parsed)
      .filter(([, entryValue]) => cleanText(String(entryValue ?? "")))
      .map(([key, entryValue]) => `${labels[key] ?? titleFromKey(key)}: ${entryValue}`);

    return entries.length > 0 ? entries.join("\n") : null;
  } catch {
    return cleaned;
  }
}

function titleFromKey(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}
