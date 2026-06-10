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
export type BrandCampaignMilestone = ReturnType<typeof buildBrandMilestones>[number];

export function sanitizeBrandCampaignDashboardData(
  data: CampaignReportLiveData,
  events: StoredCampaignEvent[] = [],
) {
  const goalDelivery = calculateBrandGoalDelivery(
    data.performance.approvedViews,
    data.campaign.goalViews,
  );
  const totalEngagement = data.platformBreakdown.reduce(
    (total, platform) => total + platform.engagement,
    0,
  );

  const timeline = buildBrandTimeline(data.timeline);

  return {
    generatedAt: data.generatedAt,
    campaign: {
      id: data.campaign.id,
      name: data.campaign.name,
      brandId: data.campaign.brandId,
      brandName: data.campaign.brandName,
      platforms: data.campaign.platforms,
      totalBudget: data.campaign.totalBudget,
      businessCpm: data.campaign.businessCpm,
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
      budgetRemaining: data.financial.budgetRemaining,
      businessCpm: data.campaign.businessCpm,
      effectiveCpm: data.financial.effectiveCpm,
      ...goalDelivery,
      totalSubmissions: data.performance.totalSubmissions,
      approvedClips: data.performance.approvedClips,
      uniquePages: data.performance.uniquePages,
      averageViewsPerApprovedClip: data.performance.approvedClips > 0
        ? data.performance.approvedViews / data.performance.approvedClips
        : null,
      totalEngagement,
      engagementRate: data.performance.approvedViews > 0
        ? totalEngagement / data.performance.approvedViews
        : null,
      expectedGoalDate: calculateExpectedGoalDate({
        startsAt: data.campaign.startsAt,
        generatedAt: data.generatedAt,
        approvedViews: data.performance.approvedViews,
        goalViews: data.campaign.goalViews,
        timeline: data.timeline,
      }),
    },
    timeline,
    milestones: buildBrandMilestones({
      startsAt: data.campaign.startsAt,
      deadline: data.campaign.deadline,
      goalViews: data.campaign.goalViews,
      timeline,
      events,
    }),
    platformBreakdown: data.platformBreakdown.map((row) => ({
      platform: row.platform,
      views: row.views,
      clips: row.clips,
      engagement: row.engagement,
      engagementRate: row.engagementRate,
      effectiveCpm: row.effectiveCpm,
    })),
    topContent: data.topContent
      .filter((row) => row.status === "APPROVED")
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
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
  const goalDelivery = calculateBrandGoalDelivery(
    data.performance.approvedViews,
    data.campaign.goalViews,
  );

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
      businessCpm: data.campaign.businessCpm,
      goalViews: data.campaign.goalViews,
      startsAt: data.campaign.startsAt,
      deadline: data.campaign.deadline,
      requirements: data.campaign.requirements,
      contentGuidelines: data.campaign.contentGuidelines,
      contentType: data.campaign.contentType,
      requiredHashtags: data.campaign.requiredHashtags,
      target: data.campaign.target,
    },
    performance: {
      approvedViews: data.performance.approvedViews,
      currentViews: data.performance.approvedViews,
      targetViews: data.campaign.goalViews,
      targetViewsSource: data.campaign.goalViewsSource,
      ...goalDelivery,
      deliveryProgress: data.performance.goalCompletion,
      goalCompletion: data.performance.goalCompletion,
      budgetUsed: data.performance.budgetUsed,
      budgetUsedPercent: data.performance.budgetUsedPercent,
      budgetRemaining: data.financial.budgetRemaining,
      businessCpm: data.campaign.businessCpm,
      effectiveCpm: data.financial.effectiveCpm,
      totalSubmissions: data.performance.totalSubmissions,
      approvedClips: data.performance.approvedClips,
      uniquePages: data.performance.uniquePages,
      approvalRate: data.performance.approvalRate,
      totalEngagement: data.platformBreakdown.reduce(
        (total, platform) => total + platform.engagement,
        0,
      ),
    },
    timeline: buildBrandTimeline(data.timeline),
    platformBreakdown: data.platformBreakdown.map((row) => ({
      platform: row.platform,
      views: row.views,
      clips: row.clips,
      engagement: row.engagement,
      engagementRate: row.engagementRate,
      effectiveCpm: row.effectiveCpm,
    })),
    topContent: data.topContent
      .filter((row) => row.status === "APPROVED")
      .map((row) => ({
      id: row.id,
      platform: row.platform,
      postUrl: row.postUrl,
      thumbnailUrl: row.thumbnailUrl,
      views: row.views,
      engagement: row.engagement,
    })),
    audience: {
      sampleCount: data.audience.sampleCount,
      ageBuckets: data.audience.ageBuckets,
      genderSplit: data.audience.genderSplit,
      topCountries: data.audience.topCountries,
    },
  };
}

export function calculateBrandGoalDelivery(
  approvedViews: number,
  goalViews: number | null,
) {
  if (!goalViews || goalViews <= 0) {
    return {
      overdeliveryViews: 0,
      overdeliveryPercent: null,
    };
  }

  const overdeliveryViews = Math.max(0, approvedViews - goalViews);
  return {
    overdeliveryViews,
    overdeliveryPercent: overdeliveryViews / goalViews,
  };
}

export function buildBrandTimeline(
  timeline: Array<{ date: string; views: number }>,
) {
  let cumulativeViews = 0;
  return timeline.map((row) => {
    cumulativeViews += row.views;
    return {
      date: row.date,
      views: row.views,
      cumulativeViews,
    };
  });
}

type StoredCampaignEvent = {
  type: "STARTED" | "PAUSED" | "RESUMED" | "COMPLETED";
  occurredAt: Date | string;
};

interface BrandMilestoneInput {
  startsAt: string | null;
  deadline: string;
  goalViews: number | null;
  timeline: Array<{ date: string; views: number; cumulativeViews: number }>;
  events: StoredCampaignEvent[];
}

const milestoneLabels = {
  STARTED: "Campagne gestart",
  PAUSED: "Campagne gepauzeerd",
  RESUMED: "Campagne hervat",
  COMPLETED: "Campagne afgerond",
  PLANNED_END: "Geplande einddatum",
  GOAL_REACHED: "Viewdoel gehaald",
} as const;

export function buildBrandMilestones({
  startsAt,
  deadline,
  goalViews,
  timeline,
  events,
}: BrandMilestoneInput) {
  const milestones: Array<{
    type: keyof typeof milestoneLabels;
    date: string;
    label: string;
  }> = [];
  const storedStart = events.find((event) => event.type === "STARTED");
  const startDate = startsAt
    ? formatDateValue(startsAt)
    : storedStart
      ? formatDateValue(storedStart.occurredAt)
      : null;

  if (startDate) {
    milestones.push({
      type: "STARTED",
      date: startDate,
      label: milestoneLabels.STARTED,
    });
  }

  for (const event of events) {
    if (event.type === "STARTED") continue;
    const date = formatDateValue(event.occurredAt);
    if (!date) continue;
    milestones.push({
      type: event.type,
      date,
      label: milestoneLabels[event.type],
    });
  }

  if (goalViews && goalViews > 0) {
    const goalPoint = timeline.find((row) => row.cumulativeViews >= goalViews);
    if (goalPoint) {
      milestones.push({
        type: "GOAL_REACHED",
        date: goalPoint.date,
        label: milestoneLabels.GOAL_REACHED,
      });
    }
  }

  const deadlineDate = formatDateValue(deadline);
  if (deadlineDate) {
    milestones.push({
      type: "PLANNED_END",
      date: deadlineDate,
      label: milestoneLabels.PLANNED_END,
    });
  }

  return milestones.sort((a, b) =>
    a.date.localeCompare(b.date) || milestoneOrder(a.type) - milestoneOrder(b.type),
  );
}

interface BrandForecastInput {
  startsAt: string | null;
  generatedAt: string;
  approvedViews: number;
  goalViews: number | null;
  timeline: Array<{ date: string; views: number }>;
}

export function calculateExpectedGoalDate({
  startsAt,
  generatedAt,
  approvedViews,
  goalViews,
  timeline,
}: BrandForecastInput) {
  if (!startsAt || !goalViews || goalViews <= 0 || approvedViews <= 0) return null;

  const chartData = buildBrandTimeline(timeline);
  const reachedPoint = chartData.find((row) => row.cumulativeViews >= goalViews);
  if (reachedPoint) return reachedPoint.date;
  if (approvedViews >= goalViews) {
    const generatedDate = startOfUtcDay(generatedAt);
    return generatedDate ? formatUtcDate(generatedDate) : null;
  }

  const latestTimelineDate = chartData.at(-1)?.date;
  const measurementDate = startOfUtcDay(latestTimelineDate ?? generatedAt);
  const campaignStart = startOfUtcDay(startsAt);
  if (!measurementDate || !campaignStart || measurementDate < campaignStart) return null;

  const elapsedDays = Math.floor(
    (measurementDate.getTime() - campaignStart.getTime()) / 86_400_000,
  ) + 1;
  const averageViewsPerDay = approvedViews / Math.max(1, elapsedDays);
  if (!Number.isFinite(averageViewsPerDay) || averageViewsPerDay <= 0) return null;

  const remainingDays = Math.ceil((goalViews - approvedViews) / averageViewsPerDay);
  const expectedDate = new Date(measurementDate);
  expectedDate.setUTCDate(expectedDate.getUTCDate() + remainingDays);
  return formatUtcDate(expectedDate);
}

function startOfUtcDay(value: string) {
  const parsed = value.length === 10
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
  ));
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? formatUtcDate(date) : null;
}

function milestoneOrder(type: keyof typeof milestoneLabels) {
  return Object.keys(milestoneLabels).indexOf(type);
}

function campaignRecency(campaign: BrandPortalCampaignSelection) {
  const value = campaign.status === "active"
    ? campaign.startsAt ?? campaign.updatedAt
    : campaign.deadline;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
