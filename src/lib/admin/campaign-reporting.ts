import { calculateCampaignReferralReport, type CampaignReferralReport } from "@/lib/campaign-referrals";
import {
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  type CampaignReportEditorial,
  type CampaignReportSectionSettings,
} from "@/lib/admin/campaign-report-shared";
import { prisma } from "@/lib/prisma";
import { computeDayDeltas } from "@/lib/stats/trends";

export {
  CAMPAIGN_REPORT_SECTION_KEYS,
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
  type CampaignReportSectionKey,
  type CampaignReportSectionSettings,
  type CampaignReportStatusValue,
} from "@/lib/admin/campaign-report-shared";

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE_SHORTS: "YouTube Shorts",
  FACEBOOK: "Facebook",
  X: "X",
  OAUTH_IG: "Instagram",
  OAUTH_TT: "TikTok",
  OAUTH_YT: "YouTube Shorts",
  OAUTH_FB: "Facebook",
};

export interface CampaignReportCampaignInput {
  id: string;
  name: string;
  description?: string | null;
  platforms: string[];
  totalBudget: number | string;
  creatorCpv: number | string;
  adminMargin: number | string;
  businessCpv: number | string;
  goalViews?: number | bigint | null;
  minimumPaidViews: number;
  maximumPaidViews?: number | null;
  startsAt?: Date | string | null;
  deadline: Date | string;
  requirements?: string | null;
  contentGuidelines?: string | null;
  requiredHashtags: string[];
  targetCountry?: string | null;
  targetCountryPercent?: number | null;
  targetMinAge18Percent?: number | null;
  targetMalePercent?: number | null;
  minFollowers?: number | null;
  minEngagementRate?: number | string | null;
  brand?: {
    id: string;
    name: string;
    niche?: string | null;
    website?: string | null;
    currency?: string | null;
  } | null;
}

export interface CampaignReportMetricSnapshotInput {
  capturedAt: Date | string;
  source?: string | null;
  viewCount: number | bigint;
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
}

export interface CampaignReportSubmissionInput {
  id: string;
  creatorId: string;
  creatorLabel: string;
  creatorEmail?: string | null;
  creatorProfileId?: string | null;
  postUrl: string;
  thumbnailUrl?: string | null;
  sourcePlatform?: string | null;
  status: string;
  createdAt: Date | string;
  reviewedAt?: Date | string | null;
  eligibleViews?: number | null;
  viewCount?: number | null;
  claimedViews?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  earnedAmount?: number | string | null;
  metricSnapshots: CampaignReportMetricSnapshotInput[];
  signals: Array<{
    type: string;
    severity: string;
    resolvedAt?: Date | string | null;
  }>;
  qcReviews: Array<{
    decision: string;
    brandFitScore?: number | null;
  }>;
}

export interface CampaignReportAudienceSnapshotInput {
  connectionType: string;
  connectionId: string;
  kind?: string;
  capturedAt: Date | string;
  ageBuckets?: Record<string, number> | null;
  genderSplit?: Record<string, number> | null;
  topCountries?: Array<{ code: string; share: number }> | null;
}

export interface CampaignReportAttributionInput {
  referrerId: string;
  referrerLabel: string;
  referredUserId: string | null;
  clickedAt?: Date | string | null;
  signedUpAt?: Date | string | null;
  onboardedAt?: Date | string | null;
  discordLinkedAt?: Date | string | null;
  socialConnectedAt?: Date | string | null;
  firstSubmissionAt?: Date | string | null;
  activeAt?: Date | string | null;
  earnedAmount: number;
}

export interface CampaignReportBuildInput {
  campaign: CampaignReportCampaignInput;
  submissions: CampaignReportSubmissionInput[];
  audienceSnapshots: CampaignReportAudienceSnapshotInput[];
  attributions: CampaignReportAttributionInput[];
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  generatedAt?: Date | string;
}

export interface CampaignReportLiveData {
  generatedAt: string;
  period: { start: string | null; end: string | null };
  campaign: {
    id: string;
    name: string;
    brandId: string | null;
    brandName: string;
    description: string | null;
    platforms: string[];
    totalBudget: number;
    creatorCpv: number;
    adminMargin: number;
    businessCpv: number;
    goalViews: number | null;
    minimumPaidViews: number;
    maximumPaidViews: number | null;
    startsAt: string | null;
    deadline: string;
    requirements: string | null;
    contentGuidelines: string | null;
    requiredHashtags: string[];
    target: {
      country: string | null;
      countryPercent: number | null;
      minAge18Percent: number | null;
      malePercent: number | null;
      minFollowers: number;
      minEngagementRate: number;
    };
  };
  performance: {
    approvedViews: number;
    goalCompletion: number | null;
    budgetUsed: number;
    budgetUsedPercent: number | null;
    costPerThousandViews: number | null;
    totalSubmissions: number;
    approvedClips: number;
    activeCreators: number;
    approvalRate: number | null;
    statusCounts: Record<string, number>;
  };
  timeline: Array<{ date: string; views: number; likes: number; comments: number; shares: number }>;
  platformBreakdown: Array<{
    platform: string;
    views: number;
    clips: number;
    engagement: number;
    cost: number;
  }>;
  topContent: Array<{
    id: string;
    creator: string;
    platform: string;
    postUrl: string;
    thumbnailUrl: string | null;
    views: number;
    engagement: number;
    earnedAmount: number;
    status: string;
  }>;
  creators: Array<{
    creatorId: string;
    creator: string;
    submissions: number;
    views: number;
    earnedAmount: number;
    flagged: number;
  }>;
  referral: CampaignReferralReport;
  quality: {
    openSignals: number;
    criticalSignals: number;
    signalCounts: Record<string, number>;
    resolvedSignals: number;
    qcDecisionCounts: Record<string, number>;
    approvedQcReviews: number;
  };
  audience: {
    sampleCount: number;
    ageBuckets: Record<string, number>;
    genderSplit: Record<string, number>;
    topCountries: Array<{ code: string; share: number }>;
  };
  defaults: CampaignReportEditorial;
}

export function buildCampaignReportLiveData(input: CampaignReportBuildInput): CampaignReportLiveData {
  const totalBudget = toNumber(input.campaign.totalBudget);
  const goalViews = input.campaign.goalViews == null ? null : Number(input.campaign.goalViews);
  const submissions = input.submissions;
  const approved = submissions.filter((submission) => submission.status === "APPROVED");
  const reviewed = submissions.filter((submission) => ["APPROVED", "REJECTED", "NEEDS_REVISION", "FLAGGED"].includes(submission.status));
  const approvedViews = approved.reduce((sum, submission) => sum + submissionViews(submission), 0);
  const budgetUsed = approved.reduce((sum, submission) => sum + toNumber(submission.earnedAmount), 0);
  const statusCounts = countBy(submissions, (submission) => submission.status);
  const activeCreators = new Set(submissions.map((submission) => submission.creatorId)).size;
  const timeline = buildTimeline(submissions);
  const platformBreakdown = buildPlatformBreakdown(approved);
  const topContent = buildTopContent(submissions);
  const creators = buildCreatorLeaderboard(submissions);
  const quality = buildQualitySummary(submissions);
  const audience = buildAudienceSummary(input.audienceSnapshots);
  const referral = calculateCampaignReferralReport({
    totalBudget,
    attributions: input.attributions.map((attribution) => ({
      ...attribution,
      onboardedAt: attribution.onboardedAt ?? null,
      firstSubmissionAt: attribution.firstSubmissionAt ?? null,
      activeAt: attribution.activeAt ?? null,
    })),
  });

  const dataWithoutDefaults = {
    generatedAt: toIso(input.generatedAt ?? new Date()),
    period: {
      start: input.periodStart ? toIso(input.periodStart) : null,
      end: input.periodEnd ? toIso(input.periodEnd) : null,
    },
    campaign: {
      id: input.campaign.id,
      name: input.campaign.name,
      brandId: input.campaign.brand?.id ?? null,
      brandName: input.campaign.brand?.name ?? input.campaign.name,
      description: input.campaign.description ?? null,
      platforms: input.campaign.platforms.map(platformLabel),
      totalBudget,
      creatorCpv: toNumber(input.campaign.creatorCpv),
      adminMargin: toNumber(input.campaign.adminMargin),
      businessCpv: toNumber(input.campaign.businessCpv),
      goalViews,
      minimumPaidViews: input.campaign.minimumPaidViews,
      maximumPaidViews: input.campaign.maximumPaidViews ?? null,
      startsAt: input.campaign.startsAt ? toIso(input.campaign.startsAt) : null,
      deadline: toIso(input.campaign.deadline),
      requirements: input.campaign.requirements ?? null,
      contentGuidelines: input.campaign.contentGuidelines ?? null,
      requiredHashtags: input.campaign.requiredHashtags,
      target: {
        country: input.campaign.targetCountry ?? null,
        countryPercent: input.campaign.targetCountryPercent ?? null,
        minAge18Percent: input.campaign.targetMinAge18Percent ?? null,
        malePercent: input.campaign.targetMalePercent ?? null,
        minFollowers: input.campaign.minFollowers ?? 0,
        minEngagementRate: toNumber(input.campaign.minEngagementRate),
      },
    },
    performance: {
      approvedViews,
      goalCompletion: goalViews && goalViews > 0 ? approvedViews / goalViews : null,
      budgetUsed,
      budgetUsedPercent: totalBudget > 0 ? budgetUsed / totalBudget : null,
      costPerThousandViews: approvedViews > 0 ? (budgetUsed / approvedViews) * 1000 : null,
      totalSubmissions: submissions.length,
      approvedClips: approved.length,
      activeCreators,
      approvalRate: reviewed.length > 0 ? approved.length / reviewed.length : null,
      statusCounts,
    },
    timeline,
    platformBreakdown,
    topContent,
    creators,
    referral,
    quality,
    audience,
  };

  return {
    ...dataWithoutDefaults,
    defaults: generateDefaultEditorial(dataWithoutDefaults),
  };
}

export async function getCampaignReportLiveData({
  campaignId,
  periodStart,
  periodEnd,
}: {
  campaignId: string;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
}): Promise<CampaignReportLiveData | null> {
  const metricWhere = dateWindow(periodStart, periodEnd);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      description: true,
      platforms: true,
      totalBudget: true,
      creatorCpv: true,
      adminMargin: true,
      businessCpv: true,
      goalViews: true,
      minimumPaidViews: true,
      maximumPaidViews: true,
      startsAt: true,
      deadline: true,
      requirements: true,
      contentGuidelines: true,
      requiredHashtags: true,
      targetCountry: true,
      targetCountryPercent: true,
      targetMinAge18Percent: true,
      targetMalePercent: true,
      minFollowers: true,
      minEngagementRate: true,
      brand: { select: { id: true, name: true, niche: true, website: true, currency: true } },
      campaignSubmissions: {
        select: {
          id: true,
          creatorId: true,
          postUrl: true,
          thumbnailUrl: true,
          sourcePlatform: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          eligibleViews: true,
          viewCount: true,
          claimedViews: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          earnedAmount: true,
          creator: {
            select: {
              email: true,
              discordUsername: true,
              creatorProfile: { select: { id: true, displayName: true, username: true } },
            },
          },
          metricSnapshots: {
            where: metricWhere,
            orderBy: { capturedAt: "asc" },
            select: {
              capturedAt: true,
              source: true,
              viewCount: true,
              likeCount: true,
              commentCount: true,
              shareCount: true,
            },
          },
          submissionSignals: {
            select: { type: true, severity: true, resolvedAt: true },
          },
          qcReviews: {
            select: { decision: true, brandFitScore: true },
          },
        },
      },
      referralAttributions: {
        select: {
          referrerId: true,
          referredUserId: true,
          clickedAt: true,
          signedUpAt: true,
          onboardedAt: true,
          discordLinkedAt: true,
          socialConnectedAt: true,
          firstSubmissionAt: true,
          activeAt: true,
          firstEarnedAmount: true,
          referrer: {
            select: {
              email: true,
              discordUsername: true,
              creatorProfile: { select: { displayName: true, username: true } },
            },
          },
        },
      },
    },
  });

  if (!campaign) return null;

  const profileIds = Array.from(new Set(
    campaign.campaignSubmissions
      .map((submission) => submission.creator.creatorProfile?.id)
      .filter((id): id is string => Boolean(id)),
  ));

  const audienceSnapshots = profileIds.length > 0 ? await loadAudienceSnapshots(profileIds) : [];
  const earnedByInvitedCreator = new Map<string, number>();
  for (const submission of campaign.campaignSubmissions) {
    if (submission.status !== "APPROVED") continue;
    earnedByInvitedCreator.set(
      submission.creatorId,
      (earnedByInvitedCreator.get(submission.creatorId) ?? 0) + toNumber(submission.earnedAmount),
    );
  }

  return buildCampaignReportLiveData({
    campaign: {
      ...campaign,
      platforms: campaign.platforms.map(String),
      totalBudget: toNumber(campaign.totalBudget),
      creatorCpv: toNumber(campaign.creatorCpv),
      adminMargin: toNumber(campaign.adminMargin),
      businessCpv: toNumber(campaign.businessCpv),
      goalViews: campaign.goalViews ? Number(campaign.goalViews) : null,
      minEngagementRate: toNumber(campaign.minEngagementRate),
      requiredHashtags: campaign.requiredHashtags,
    },
    submissions: campaign.campaignSubmissions.map((submission) => ({
      id: submission.id,
      creatorId: submission.creatorId,
      creatorLabel:
        submission.creator.creatorProfile?.displayName ??
        submission.creator.discordUsername ??
        submission.creator.email,
      creatorEmail: submission.creator.email,
      creatorProfileId: submission.creator.creatorProfile?.id ?? null,
      postUrl: submission.postUrl,
      thumbnailUrl: submission.thumbnailUrl,
      sourcePlatform: submission.sourcePlatform,
      status: submission.status,
      createdAt: submission.createdAt,
      reviewedAt: submission.reviewedAt,
      eligibleViews: submission.eligibleViews,
      viewCount: submission.viewCount,
      claimedViews: submission.claimedViews,
      likeCount: submission.likeCount,
      commentCount: submission.commentCount,
      shareCount: submission.shareCount,
      earnedAmount: toNumber(submission.earnedAmount),
      metricSnapshots: submission.metricSnapshots.map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        source: snapshot.source,
        viewCount: Number(snapshot.viewCount),
        likeCount: snapshot.likeCount,
        commentCount: snapshot.commentCount,
        shareCount: snapshot.shareCount,
      })),
      signals: submission.submissionSignals,
      qcReviews: submission.qcReviews,
    })),
    audienceSnapshots,
    attributions: campaign.referralAttributions.map((attribution) => ({
      referrerId: attribution.referrerId,
      referrerLabel:
        attribution.referrer.creatorProfile?.displayName ??
        attribution.referrer.discordUsername ??
        attribution.referrer.email,
      referredUserId: attribution.referredUserId,
      clickedAt: attribution.clickedAt,
      signedUpAt: attribution.signedUpAt,
      onboardedAt: attribution.onboardedAt,
      discordLinkedAt: attribution.discordLinkedAt,
      socialConnectedAt: attribution.socialConnectedAt,
      firstSubmissionAt: attribution.firstSubmissionAt,
      activeAt: attribution.activeAt,
      earnedAmount: attribution.referredUserId
        ? earnedByInvitedCreator.get(attribution.referredUserId) ?? 0
        : toNumber(attribution.firstEarnedAmount),
    })),
    periodStart,
    periodEnd,
  });
}

function generateDefaultEditorial(data: Omit<CampaignReportLiveData, "defaults">): CampaignReportEditorial {
  const topPlatform = data.platformBreakdown[0];
  const goalText = data.performance.goalCompletion == null
    ? "zonder vast viewdoel"
    : `${formatPercent(data.performance.goalCompletion)} van het viewdoel`;
  const qualityText = data.quality.criticalSignals === 0
    ? "zonder open kritieke kwaliteitsissues"
    : `met ${data.quality.criticalSignals} kritieke signalen die aandacht vragen`;
  const cpvText = data.performance.costPerThousandViews == null
    ? "n.v.t."
    : `EUR ${data.performance.costPerThousandViews.toFixed(2)} per 1.000 views`;

  const keyTakeaways = [
    `${data.campaign.brandName} behaalde ${formatNumber(data.performance.approvedViews)} goedgekeurde views, ${goalText}.`,
    topPlatform
      ? `${topPlatform.platform} leverde het grootste bereik met ${formatNumber(topPlatform.views)} views.`
      : "Er is nog onvoldoende platformdata om een kanaalwinnaar te kiezen.",
    `De campagne activeerde ${data.performance.activeCreators} creators en leverde ${data.performance.approvedClips} goedgekeurde clips op.`,
    `De effectieve CPV kwam uit op ${cpvText}.`,
    `De traffic en contentkwaliteit zijn gecontroleerd ${qualityText}.`,
  ];

  const learnings = [
    topPlatform
      ? `Verdubbel op formats die op ${topPlatform.platform} vroeg aandacht trekken en snel de brand zichtbaar maken.`
      : "Zorg dat de eerste ronde clips voldoende platformvolume oplevert om duidelijke kanaallearnings te kunnen trekken.",
    data.topContent[0]
      ? `Gebruik de beste clip van ${data.topContent[0].creator} als referentie voor hook, tempo en visuele brand placement.`
      : "Voeg voorbeeldclips toe zodra de eerste goedgekeurde posts live zijn.",
    data.performance.approvalRate != null && data.performance.approvalRate < 0.7
      ? "Maak requirements en do's/don'ts scherper om revision-rate te verlagen."
      : "De huidige briefing is bruikbaar als basis voor een volgende ronde.",
  ];

  const nextCampaignRecommendations = [
    topPlatform
      ? `Reserveer extra budget voor ${topPlatform.platform}, omdat dit kanaal de sterkste delivery liet zien.`
      : "Start de volgende campagne met duidelijke platformverdeling zodat performance sneller vergelijkbaar wordt.",
    "Nodig de top creators opnieuw uit en geef hen vroeg toegang tot de nieuwe brief.",
    "Maak 3 concrete hook-angles en voeg voorbeeldclips toe aan de creator brief.",
    "Houd quality checks actief op logo/brand placement, duplicate content en afwijkende engagementratio's.",
  ];

  return {
    title: `${data.campaign.brandName} campagnerapport`,
    executiveSummary: `${data.campaign.brandName} behaalde ${formatNumber(data.performance.approvedViews)} goedgekeurde views met ${data.performance.approvedClips} goedgekeurde clips. ${topPlatform ? `${topPlatform.platform} was het sterkste bereikskanaal.` : "Er is nog geen duidelijke platformwinnaar."} Voor de volgende campagne adviseren we de best presterende creators opnieuw te activeren, de winnende hooks expliciet in de brief te zetten en het budget te verschuiven naar de kanalen met de laagste effectieve CPV.`,
    keyTakeaways,
    learnings,
    nextCampaignRecommendations,
    sectionSettings: { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS },
  };
}

function buildTimeline(submissions: CampaignReportSubmissionInput[]) {
  const byDate = new Map<string, { date: string; views: number; likes: number; comments: number; shares: number }>();
  for (const submission of submissions) {
    const deltas = computeDayDeltas(submission.metricSnapshots.map((snapshot) => ({
      capturedAt: toDate(snapshot.capturedAt),
      viewCount: snapshot.viewCount,
      likeCount: snapshot.likeCount ?? 0,
      commentCount: snapshot.commentCount ?? 0,
      shareCount: snapshot.shareCount ?? 0,
    })));

    for (const row of deltas) {
      const current = byDate.get(row.date) ?? { date: row.date, views: 0, likes: 0, comments: 0, shares: 0 };
      current.views += row.views;
      current.likes += row.likes;
      current.comments += row.comments;
      current.shares += row.shares;
      byDate.set(row.date, current);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildPlatformBreakdown(submissions: CampaignReportSubmissionInput[]) {
  const rows = new Map<string, { platform: string; views: number; clips: number; engagement: number; cost: number }>();
  for (const submission of submissions) {
    const platform = inferPlatform(submission);
    const current = rows.get(platform) ?? { platform, views: 0, clips: 0, engagement: 0, cost: 0 };
    current.views += submissionViews(submission);
    current.clips += 1;
    current.engagement += submissionEngagement(submission);
    current.cost += toNumber(submission.earnedAmount);
    rows.set(platform, current);
  }
  return Array.from(rows.values()).sort((a, b) => b.views - a.views);
}

function buildTopContent(submissions: CampaignReportSubmissionInput[]) {
  return submissions
    .map((submission) => ({
      id: submission.id,
      creator: submission.creatorLabel,
      platform: inferPlatform(submission),
      postUrl: submission.postUrl,
      thumbnailUrl: submission.thumbnailUrl ?? null,
      views: submissionViews(submission),
      engagement: submissionEngagement(submission),
      earnedAmount: toNumber(submission.earnedAmount),
      status: submission.status,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

function buildCreatorLeaderboard(submissions: CampaignReportSubmissionInput[]) {
  const rows = new Map<string, { creatorId: string; creator: string; submissions: number; views: number; earnedAmount: number; flagged: number }>();
  for (const submission of submissions) {
    const current = rows.get(submission.creatorId) ?? {
      creatorId: submission.creatorId,
      creator: submission.creatorLabel,
      submissions: 0,
      views: 0,
      earnedAmount: 0,
      flagged: 0,
    };
    current.submissions += 1;
    if (submission.status === "APPROVED") {
      current.views += submissionViews(submission);
      current.earnedAmount += toNumber(submission.earnedAmount);
    }
    current.flagged += submission.signals.some((signal) => !signal.resolvedAt && ["WARN", "CRITICAL"].includes(signal.severity)) ? 1 : 0;
    rows.set(submission.creatorId, current);
  }
  return Array.from(rows.values()).sort((a, b) => b.views - a.views).slice(0, 20);
}

function buildQualitySummary(submissions: CampaignReportSubmissionInput[]) {
  const signals = submissions.flatMap((submission) => submission.signals);
  const openSignals = signals.filter((signal) => !signal.resolvedAt && ["WARN", "CRITICAL"].includes(signal.severity));
  const qcReviews = submissions.flatMap((submission) => submission.qcReviews);
  return {
    openSignals: openSignals.length,
    criticalSignals: openSignals.filter((signal) => signal.severity === "CRITICAL").length,
    signalCounts: countBy(openSignals, (signal) => signal.type),
    resolvedSignals: signals.filter((signal) => Boolean(signal.resolvedAt)).length,
    qcDecisionCounts: countBy(qcReviews, (review) => review.decision),
    approvedQcReviews: qcReviews.filter((review) => review.decision === "APPROVED").length,
  };
}

function buildAudienceSummary(snapshots: CampaignReportAudienceSnapshotInput[]) {
  const latest = latestAudienceSnapshots(snapshots);
  const ageBuckets: Record<string, number> = {};
  const genderSplit: Record<string, number> = {};
  const countryTotals: Record<string, number> = {};

  for (const snapshot of latest) {
    for (const [bucket, value] of Object.entries(snapshot.ageBuckets ?? {})) {
      ageBuckets[bucket] = (ageBuckets[bucket] ?? 0) + (Number(value) || 0);
    }
    for (const [bucket, value] of Object.entries(snapshot.genderSplit ?? {})) {
      genderSplit[bucket] = (genderSplit[bucket] ?? 0) + (Number(value) || 0);
    }
    for (const country of snapshot.topCountries ?? []) {
      countryTotals[country.code] = (countryTotals[country.code] ?? 0) + (Number(country.share) || 0);
    }
  }

  return {
    sampleCount: latest.length,
    ageBuckets,
    genderSplit,
    topCountries: Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, share]) => ({ code, share })),
  };
}

function latestAudienceSnapshots(snapshots: CampaignReportAudienceSnapshotInput[]) {
  const sorted = [...snapshots].sort((a, b) => toDate(b.capturedAt).getTime() - toDate(a.capturedAt).getTime());
  const seen = new Set<string>();
  const latest: CampaignReportAudienceSnapshotInput[] = [];
  for (const snapshot of sorted) {
    const key = `${snapshot.connectionType}:${snapshot.connectionId}:${snapshot.kind ?? "FOLLOWER"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push(snapshot);
  }
  return latest;
}

async function loadAudienceSnapshots(profileIds: string[]): Promise<CampaignReportAudienceSnapshotInput[]> {
  const [ig, tt, yt, fb] = await Promise.all([
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId: { in: profileIds }, isVerified: true }, select: { id: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId: { in: profileIds }, isVerified: true }, select: { id: true } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId: { in: profileIds }, isVerified: true }, select: { id: true } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId: { in: profileIds }, isVerified: true }, select: { id: true } }),
  ]);

  const filters = [
    { connectionType: "IG", ids: ig.map((row) => row.id) },
    { connectionType: "TT", ids: tt.map((row) => row.id) },
    { connectionType: "YT", ids: yt.map((row) => row.id) },
    { connectionType: "FB", ids: fb.map((row) => row.id) },
  ].filter((filter) => filter.ids.length > 0);

  if (filters.length === 0) return [];

  const rows = await prisma.audienceSnapshot.findMany({
    where: {
      OR: filters.map((filter) => ({
        connectionType: filter.connectionType as "IG" | "TT" | "YT" | "FB",
        connectionId: { in: filter.ids },
      })),
    },
    orderBy: { capturedAt: "desc" },
    take: 500,
  });

  return rows.map((row) => ({
    connectionType: row.connectionType,
    connectionId: row.connectionId,
    kind: row.kind,
    capturedAt: row.capturedAt,
    ageBuckets: row.ageBuckets as Record<string, number>,
    genderSplit: row.genderSplit as Record<string, number>,
    topCountries: row.topCountries as Array<{ code: string; share: number }>,
  }));
}

function submissionViews(submission: CampaignReportSubmissionInput) {
  const latest = latestSnapshot(submission);
  return Number(submission.eligibleViews ?? latest?.viewCount ?? submission.viewCount ?? submission.claimedViews ?? 0);
}

function submissionEngagement(submission: CampaignReportSubmissionInput) {
  const latest = latestSnapshot(submission);
  return (
    (latest?.likeCount ?? submission.likeCount ?? 0) +
    (latest?.commentCount ?? submission.commentCount ?? 0) +
    (latest?.shareCount ?? submission.shareCount ?? 0)
  );
}

function latestSnapshot(submission: CampaignReportSubmissionInput) {
  if (submission.metricSnapshots.length === 0) return null;
  return [...submission.metricSnapshots].sort((a, b) => toDate(b.capturedAt).getTime() - toDate(a.capturedAt).getTime())[0];
}

function inferPlatform(submission: CampaignReportSubmissionInput) {
  const snapshotSource = latestSnapshot(submission)?.source;
  return platformLabel(snapshotSource ?? submission.sourcePlatform ?? "Onbekend");
}

function platformLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return PLATFORM_LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item) || "UNKNOWN";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function dateWindow(periodStart?: Date | string | null, periodEnd?: Date | string | null) {
  const capturedAt: { gte?: Date; lte?: Date } = {};
  if (periodStart) capturedAt.gte = toDate(periodStart);
  if (periodEnd) capturedAt.lte = toDate(periodEnd);
  return Object.keys(capturedAt).length > 0 ? { capturedAt } : {};
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function toIso(value: Date | string) {
  return toDate(value).toISOString();
}

function toNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("nl-NL").format(Math.round(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
