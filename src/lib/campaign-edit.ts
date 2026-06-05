const THOUSAND = 1_000;

export interface CampaignEditFormState {
  name: string;
  status: string;
  brandId: string;
  pricingTemplateId: string;
  platforms: string[];
  niche: string;
  description: string;
  contentType: string;
  contentGuidelines: string;
  requirements: string;
  otherNotes: string;
  pageStats: string;
  minAge: string;
  referralLink: string;
  bannerUrl: string | null;
  bannerVideoUrl: string;
  briefAssetUrl: string;
  guidelinesUrl: string;
  contentAssetUrlsText: string;
  requiredHashtagsText: string;
  targetCountry: string;
  targetCountryPercent: string;
  targetMinAge18Percent: string;
  targetMalePercent: string;
  minFollowers: string;
  minEngagementRate: string;
  bioRequirement: string;
  linkInBioRequired: string;
  bioKeywordsText: string;
  totalBudget: string;
  goalViews: string;
  minimumPaidViews: string;
  maximumPaidViews: string;
  creatorRatePerK: string;
  adminMarginPerK: string;
  deadline: string;
  startsAt: string;
  maxSlots: string;
  requiresApproval: boolean;
}

export function ratePerKToCpv(value: number): number {
  return value / THOUSAND;
}

export function cpvToRatePerK(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed * THOUSAND : 0;
}

export function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberOrZero(value: string): number {
  return numberOrNull(value) ?? 0;
}

export function calculateGoalViewsFromBudgetAndCpm(totalBudget: number, businessRatePerK: number): number | null {
  if (totalBudget <= 0 || businessRatePerK <= 0) return null;
  return Math.max(1, Math.round((totalBudget / businessRatePerK) * THOUSAND));
}

function dateOrNull(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function buildCampaignEditPayload(state: CampaignEditFormState) {
  const totalBudget = numberOrZero(state.totalBudget);
  const creatorRatePerK = numberOrZero(state.creatorRatePerK);
  const adminMarginPerK = numberOrZero(state.adminMarginPerK);
  const businessRatePerK = creatorRatePerK + adminMarginPerK;
  const goalViews = calculateGoalViewsFromBudgetAndCpm(totalBudget, businessRatePerK) ?? numberOrNull(state.goalViews);

  return {
    name: state.name.trim(),
    status: state.status,
    brandId: emptyToNull(state.brandId),
    pricingTemplateId: emptyToNull(state.pricingTemplateId),
    platforms: state.platforms,
    niche: emptyToNull(state.niche),
    description: emptyToNull(state.description),
    contentType: emptyToNull(state.contentType),
    contentGuidelines: emptyToNull(state.contentGuidelines),
    requirements: emptyToNull(state.requirements),
    otherNotes: emptyToNull(state.otherNotes),
    pageStats: emptyToNull(state.pageStats),
    minAge: emptyToNull(state.minAge),
    referralLink: emptyToNull(state.referralLink),
    bannerUrl: state.bannerUrl,
    bannerVideoUrl: emptyToNull(state.bannerVideoUrl),
    briefAssetUrl: emptyToNull(state.briefAssetUrl),
    guidelinesUrl: emptyToNull(state.guidelinesUrl),
    contentAssetUrls: parseLines(state.contentAssetUrlsText),
    requiredHashtags: parseLines(state.requiredHashtagsText),
    targetCountry: emptyToNull(state.targetCountry),
    targetCountryPercent: numberOrNull(state.targetCountryPercent),
    targetMinAge18Percent: numberOrNull(state.targetMinAge18Percent),
    targetMalePercent: numberOrNull(state.targetMalePercent),
    minFollowers: numberOrZero(state.minFollowers),
    minEngagementRate: numberOrZero(state.minEngagementRate),
    bioRequirement: emptyToNull(state.bioRequirement),
    linkInBioRequired: emptyToNull(state.linkInBioRequired),
    bioKeywords: parseLines(state.bioKeywordsText),
    totalBudget,
    goalViews,
    minimumPaidViews: numberOrZero(state.minimumPaidViews),
    maximumPaidViews: numberOrNull(state.maximumPaidViews),
    creatorRatePerK,
    adminMarginPerK,
    deadline: dateOrNull(state.deadline),
    startsAt: dateOrNull(state.startsAt),
    maxSlots: numberOrNull(state.maxSlots),
    requiresApproval: state.requiresApproval,
  };
}
