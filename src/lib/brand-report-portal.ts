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
export type BrandPausePeriod = ReturnType<typeof buildBrandPausePeriods>[number];
export type BrandForecast = ReturnType<typeof calculateBrandForecast>;

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
  const pausePeriods = buildBrandPausePeriods(events);
  const forecast = calculateBrandForecast({
    startsAt: data.campaign.startsAt,
    generatedAt: data.generatedAt,
    approvedViews: data.performance.approvedViews,
    goalViews: data.campaign.goalViews,
    timeline: data.timeline,
    pausePeriods,
  });

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
      expectedGoalDate: forecast.expectedGoalDate,
      forecast,
    },
    timeline,
    pausePeriods,
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

export function buildBrandPausePeriods(events: StoredCampaignEvent[]) {
  const periods: Array<{ startDate: string; endDate: string | null }> = [];
  const sortedEvents = [...events]
    .map((event) => ({
      ...event,
      date: formatDateValue(event.occurredAt),
      time: new Date(event.occurredAt).getTime(),
    }))
    .filter(
      (event): event is typeof event & { date: string } =>
        event.date !== null && Number.isFinite(event.time),
    )
    .sort((a, b) => a.time - b.time);
  let openStart: string | null = null;

  for (const event of sortedEvents) {
    if (event.type === "PAUSED" && !openStart) {
      openStart = event.date;
      continue;
    }
    if ((event.type === "RESUMED" || event.type === "COMPLETED") && openStart) {
      if (event.date > openStart) {
        periods.push({ startDate: openStart, endDate: event.date });
      }
      openStart = null;
    }
  }

  if (openStart) {
    periods.push({ startDate: openStart, endDate: null });
  }

  return periods;
}

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
  pausePeriods?: Array<{ startDate: string; endDate: string | null }>;
}

export function calculateBrandForecast({
  startsAt,
  generatedAt,
  approvedViews,
  goalViews,
  timeline,
  pausePeriods = [],
}: BrandForecastInput) {
  const unavailable = {
    status: "unavailable" as const,
    expectedGoalDate: null,
    averageViewsPerActiveDay: null,
    activeDays: 0,
    excludedPauseDays: 0,
  };
  if (!startsAt || !goalViews || goalViews <= 0 || approvedViews <= 0) return unavailable;

  const chartData = buildBrandTimeline(timeline);
  const latestTimelineDate = chartData.at(-1)?.date;
  const measurementDate = startOfUtcDay(latestTimelineDate ?? generatedAt);
  const campaignStart = startOfUtcDay(startsAt);
  if (!measurementDate || !campaignStart || measurementDate < campaignStart) return unavailable;

  const elapsedDays = Math.floor(
    (measurementDate.getTime() - campaignStart.getTime()) / 86_400_000,
  ) + 1;
  const excludedPauseDays = countPausedCalendarDays(
    campaignStart,
    measurementDate,
    pausePeriods,
  );
  const activeDays = Math.max(0, elapsedDays - excludedPauseDays);
  const averageViewsPerActiveDay = activeDays > 0 ? approvedViews / activeDays : null;
  const base = {
    averageViewsPerActiveDay,
    activeDays,
    excludedPauseDays,
  };

  const reachedPoint = chartData.find((row) => row.cumulativeViews >= goalViews);
  if (reachedPoint || approvedViews >= goalViews) {
    const generatedDate = startOfUtcDay(generatedAt);
    return {
      status: "reached" as const,
      expectedGoalDate: reachedPoint?.date
        ?? (generatedDate ? formatUtcDate(generatedDate) : formatUtcDate(measurementDate)),
      ...base,
    };
  }

  if (isForecastCurrentlyPaused(pausePeriods, generatedAt)) {
    return {
      status: "paused" as const,
      expectedGoalDate: null,
      ...base,
    };
  }

  if (!averageViewsPerActiveDay || !Number.isFinite(averageViewsPerActiveDay)) {
    return { ...unavailable, ...base };
  }

  const remainingDays = Math.ceil((goalViews - approvedViews) / averageViewsPerActiveDay);
  const expectedDate = new Date(measurementDate);
  expectedDate.setUTCDate(expectedDate.getUTCDate() + remainingDays);
  return {
    status: "active" as const,
    expectedGoalDate: formatUtcDate(expectedDate),
    ...base,
  };
}

export function calculateExpectedGoalDate(input: BrandForecastInput) {
  return calculateBrandForecast(input).expectedGoalDate;
}

function countPausedCalendarDays(
  campaignStart: Date,
  measurementDate: Date,
  pausePeriods: Array<{ startDate: string; endDate: string | null }>,
) {
  let pausedDays = 0;
  for (
    let day = new Date(campaignStart);
    day <= measurementDate;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    const date = formatUtcDate(day);
    if (pausePeriods.some((period) => isDateInPausePeriod(date, period))) {
      pausedDays += 1;
    }
  }
  return pausedDays;
}

function isForecastCurrentlyPaused(
  pausePeriods: Array<{ startDate: string; endDate: string | null }>,
  generatedAt: string,
) {
  const generatedDate = startOfUtcDay(generatedAt);
  if (!generatedDate) return false;
  const date = formatUtcDate(generatedDate);
  return pausePeriods.some((period) => period.endDate == null && date >= period.startDate);
}

function isDateInPausePeriod(
  date: string,
  period: { startDate: string; endDate: string | null },
) {
  return date >= period.startDate && (period.endDate == null || date < period.endDate);
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
