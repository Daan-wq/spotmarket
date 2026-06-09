import type { CampaignReportLiveData } from "@/lib/admin/campaign-reporting";
import type { Prisma } from "@prisma/client";

export const BRAND_PORTAL_CAMPAIGN_STATUSES = ["active", "completed"] as const;

interface BrandPortalCampaignSelection {
  id: string;
  status: string;
  startsAt: Date | string | null;
  deadline: Date | string;
  updatedAt: Date | string;
}

export function buildBrandPortalCampaignWhere(brandIds: string[] | null): Prisma.CampaignWhereInput {
  return {
    ...(brandIds ? { brandId: { in: brandIds } } : {}),
    brand: { portalEnabled: true },
    status: { in: [...BRAND_PORTAL_CAMPAIGN_STATUSES] },
  };
}

export function sortBrandPortalCampaigns<T extends BrandPortalCampaignSelection>(campaigns: T[]): T[] {
  return [...campaigns].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return campaignRecency(b) - campaignRecency(a);
  });
}

export function selectBrandPortalCampaign<T extends BrandPortalCampaignSelection>(
  campaigns: T[],
  requestedId: string | null | undefined,
): T | null {
  const requested = requestedId ? campaigns.find((campaign) => campaign.id === requestedId) : null;
  if (requested) return requested;
  return sortBrandPortalCampaigns(campaigns)[0] ?? null;
}

export function buildBrandVisibleReportWhere(brandIds: string[]): Prisma.CampaignReportWhereInput {
  return {
    brandId: { in: brandIds },
    brand: { portalEnabled: true },
    status: "FINAL",
    visibleToBrand: true,
  };
}

export type BrandReportLiveData = ReturnType<typeof sanitizeBrandReportLiveData>;
export type BrandCampaignDashboardData = ReturnType<typeof sanitizeBrandCampaignDashboardData>;

export function sanitizeBrandCampaignDashboardData(data: CampaignReportLiveData) {
  return {
    generatedAt: data.generatedAt,
    campaign: {
      id: data.campaign.id,
      name: data.campaign.name,
      brandId: data.campaign.brandId,
      brandName: data.campaign.brandName,
      platforms: data.campaign.platforms,
      totalBudget: data.campaign.totalBudget,
      goalViews: data.campaign.goalViews,
      startsAt: data.campaign.startsAt,
      deadline: data.campaign.deadline,
    },
    performance: {
      currentViews: data.performance.approvedViews,
      targetViews: data.campaign.goalViews,
      deliveryProgress: data.performance.goalCompletion,
      budgetUsed: data.performance.budgetUsed,
      budgetUsedPercent: data.performance.budgetUsedPercent,
      overdeliveryViews: data.financial.overdeliveryViews,
      overdeliveryPercent: data.financial.overdeliveryRate,
    },
    timeline: data.timeline.map((row) => ({ date: row.date, views: row.views })),
    topContent: data.topContent
      .filter((row) => row.status === "APPROVED")
      .sort((a, b) => b.views - a.views)
      .slice(0, 6)
      .map((row) => ({
        id: row.id,
        platform: row.platform,
        postUrl: row.postUrl,
        thumbnailUrl: row.thumbnailUrl,
        views: row.views,
        engagement: row.engagement,
      })),
  };
}

export function sanitizeBrandReportLiveData(data: CampaignReportLiveData) {
  const creatorAliases = buildCreatorAliases(data);

  return {
    generatedAt: data.generatedAt,
    period: data.period,
    campaign: {
      id: data.campaign.id,
      name: data.campaign.name,
      brandId: data.campaign.brandId,
      brandName: data.campaign.brandName,
      description: data.campaign.description,
      bannerUrl: null,
      platforms: data.campaign.platforms,
      totalBudget: data.campaign.totalBudget,
      businessCpv: data.campaign.businessCpv,
      goalViews: data.campaign.goalViews,
      minimumPaidViews: data.campaign.minimumPaidViews,
      maximumPaidViews: data.campaign.maximumPaidViews,
      startsAt: data.campaign.startsAt,
      deadline: data.campaign.deadline,
      contentGuidelines: data.campaign.contentGuidelines,
      requiredHashtags: data.campaign.requiredHashtags,
      target: data.campaign.target,
    },
    performance: {
      approvedViews: data.performance.approvedViews,
      currentViews: data.performance.approvedViews,
      targetViews: data.campaign.goalViews,
      targetViewsSource: data.campaign.goalViewsSource,
      paidEligibleViews: data.financial.approvedPayableViews,
      overdeliveryViews: data.financial.overdeliveryViews,
      overdeliveryPercent: data.financial.overdeliveryRate,
      deliveryProgress: data.performance.goalCompletion,
      cpmPerThousand: data.financial.effectiveCpm,
      goalCompletion: data.performance.goalCompletion,
      budgetUsed: data.performance.budgetUsed,
      budgetUsedPercent: data.performance.budgetUsedPercent,
      costPerThousandViews: data.financial.effectiveCpm ?? data.performance.costPerThousandViews,
      totalSubmissions: data.performance.totalSubmissions,
      approvedClips: data.performance.approvedClips,
      activeCreators: data.performance.activeCreators,
      approvalRate: data.performance.approvalRate,
    },
    timeline: data.timeline,
    platformBreakdown: data.platformBreakdown,
    topContent: data.topContent.map((row) => ({
      id: row.id,
      creator: aliasForCreator(creatorAliases, row.creator),
      platform: row.platform,
      postUrl: row.postUrl,
      thumbnailUrl: row.thumbnailUrl,
      views: row.views,
      engagement: row.engagement,
    })),
    creators: data.creators.map((row) => ({
      creator: aliasForCreator(creatorAliases, row.creatorId, row.creator),
      submissions: row.submissions,
      approvedSubmissions: estimateApprovedSubmissions(row.submissions, row.approvalRate),
      views: row.views,
      approvalRate: row.approvalRate,
    })),
    quality: {
      status: data.quality.trafficQualityStatus,
      reviewedClips: data.quality.approvedQcReviews,
    },
    audience: data.audience,
    defaults: {
      ...data.defaults,
      sectionSettings: {
        ...data.defaults.sectionSettings,
        appendix: false,
      },
    },
  };
}

function buildCreatorAliases(data: CampaignReportLiveData) {
  const aliases = new Map<string, string>();
  data.creators.forEach((creator, index) => {
    const alias = `Creator #${index + 1}`;
    aliases.set(creator.creatorId, alias);
    aliases.set(creator.creator, alias);
  });
  return aliases;
}

function aliasForCreator(aliases: Map<string, string>, primary: string, fallback?: string) {
  return aliases.get(primary) ?? (fallback ? aliases.get(fallback) : undefined) ?? "Creator";
}

function estimateApprovedSubmissions(submissions: number, approvalRate: number | null) {
  if (approvalRate == null) return submissions;
  return Math.round(submissions * approvalRate);
}

function campaignRecency(campaign: BrandPortalCampaignSelection) {
  const value = campaign.status === "active"
    ? campaign.startsAt ?? campaign.updatedAt
    : campaign.deadline;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
