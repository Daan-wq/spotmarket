import { calculateCampaignReferralReport, type CampaignReferralReport } from "@/lib/campaign-referrals";
import {
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  type CampaignReportEditorial,
  type CampaignReportEditorialContent,
  type CampaignReportSectionSettings,
} from "@/lib/admin/campaign-report-shared";
import { prisma } from "@/lib/prisma";
import { computeDayDeltas } from "@/lib/stats/trends";

export {
  CAMPAIGN_REPORT_SECTION_KEYS,
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  createEmptyEditorialContent,
  normalizeSectionSettings,
  normalizeTextList,
  type CampaignReportEditorial,
  type CampaignReportEditorialContent,
  type CampaignReportSectionKey,
  type CampaignReportSectionSettings,
  type CampaignReportStatusValue,
} from "@/lib/admin/campaign-report-shared";

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube Shorts",
  YOUTUBE_SHORTS: "YouTube Shorts",
  FACEBOOK: "Facebook",
  X: "X",
  OAUTH_IG: "Instagram",
  OAUTH_TT: "TikTok",
  OAUTH_YT: "YouTube Shorts",
  OAUTH_FB: "Facebook",
};

export type CampaignReportGoalViewsSource = "manual" | "budget_cpm" | "missing";
export type CampaignReportPacingStatus = "Voor op schema" | "Op schema" | "Achter op schema" | "Tijdschema ontbreekt";
export type CampaignReportAudienceFitStatus = "Sterke match" | "Gedeeltelijke match" | "Verbetering nodig" | "Onvoldoende data";
export type CampaignReportTrafficQualityStatus = "Goedgekeurd" | "Goedgekeurd met uitsluitingen" | "Aandacht nodig";

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
  contentType?: string | null;
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
  normalizedPlatform?: string | null;
  sourcePlatform?: string | null;
  authorHandle?: string | null;
  sourceConnectionType?: string | null;
  sourceConnectionId?: string | null;
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
    creatorCpm: number;
    adminMargin: number;
    businessCpv: number;
    businessCpm: number;
    goalViews: number | null;
    goalViewsSource: CampaignReportGoalViewsSource;
    minimumPaidViews: number;
    maximumPaidViews: number | null;
    startsAt: string | null;
    deadline: string;
    requirements: string | null;
    contentGuidelines: string | null;
    contentType: string | null;
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
    uniqueCreators: number;
    uniquePages: number;
    approvalRate: number | null;
    pacingStatus: CampaignReportPacingStatus;
    statusCounts: Record<string, number>;
  };
  financial: {
    totalBudget: number;
    budgetUsed: number;
    budgetRemaining: number;
    approvedPayableViews: number;
    overdeliveryViews: number;
    overdeliveryRate: number | null;
    overdeliveryValue: number | null;
    effectiveCpv: number | null;
    effectiveCpm: number | null;
    costPerApprovedClip: number | null;
    costPerActiveCreator: number | null;
    forecastApprovedViews: number | null;
    forecastBudgetUsed: number | null;
    unusedBudgetExplanation: string;
    overdeliveryExplanation: string;
  };
  timeline: Array<{ date: string; views: number; likes: number; comments: number; shares: number }>;
  platformBreakdown: Array<{
    platform: string;
    views: number;
    clips: number;
    engagement: number;
    cost: number;
    averageViewsPerClip: number;
    effectiveCpv: number | null;
    effectiveCpm: number | null;
    engagementRate: number | null;
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
    approvalRate: number | null;
    averageViewsPerApprovedClip: number | null;
    reliabilityStatus: "Aanbevolen" | "Monitoren" | "Controleren";
    recommendedForNextCampaign: boolean;
  }>;
  referral: CampaignReferralReport;
  quality: {
    openSignals: number;
    criticalSignals: number;
    signalCounts: Record<string, number>;
    resolvedSignals: number;
    qcDecisionCounts: Record<string, number>;
    approvedQcReviews: number;
    excludedClips: number;
    excludedViews: number;
    trafficQualityStatus: CampaignReportTrafficQualityStatus;
    clientSummary: string;
  };
  audience: {
    sampleCount: number;
    ageBuckets: Record<string, number>;
    genderSplit: Record<string, number>;
    topCountries: Array<{ code: string; share: number }>;
    fitStatus: CampaignReportAudienceFitStatus;
  };
  defaults: CampaignReportEditorial;
}

export function buildCampaignReportLiveData(input: CampaignReportBuildInput): CampaignReportLiveData {
  const generatedAt = input.generatedAt ?? new Date();
  const totalBudget = toNumber(input.campaign.totalBudget);
  const creatorCpv = toNumber(input.campaign.creatorCpv);
  const adminMargin = toNumber(input.campaign.adminMargin);
  const businessCpv = toNumber(input.campaign.businessCpv);
  const storedGoalViews = input.campaign.goalViews == null ? null : Number(input.campaign.goalViews);
  const derivedGoalViews = calculateBudgetGoalViews(totalBudget, businessCpv);
  const goalViews = storedGoalViews && storedGoalViews > 0 ? storedGoalViews : derivedGoalViews;
  const goalViewsSource: CampaignReportGoalViewsSource = storedGoalViews && storedGoalViews > 0
    ? "manual"
    : goalViews
      ? "budget_cpm"
      : "missing";
  const submissions = input.submissions;
  const approved = submissions.filter((submission) => submission.status === "APPROVED");
  const reviewed = submissions.filter((submission) => ["APPROVED", "REJECTED", "NEEDS_REVISION", "FLAGGED"].includes(submission.status));
  const approvedViews = approved.reduce((sum, submission) => sum + submissionViews(submission), 0);
  const budgetUsed = approved.reduce((sum, submission) => sum + toNumber(submission.earnedAmount), 0);
  const approvedPayableViews = paidViewBasis({ submissions: approved, budgetUsed, businessCpv });
  const statusCounts = countBy(submissions, (submission) => submission.status);
  const uniqueCreators = new Set(submissions.map((submission) => submission.creatorId)).size;
  const uniquePages = countUniquePages(submissions);
  const timeline = buildTimeline(submissions);
  const platformBreakdown = buildPlatformBreakdown(approved);
  const topContent = buildTopContent(submissions);
  const creators = buildCreatorLeaderboard(submissions);
  const quality = buildQualitySummary(submissions);
  const audience = buildAudienceSummary(input.audienceSnapshots, input.campaign);
  const periodStartForPacing = input.periodStart ?? input.campaign.startsAt ?? firstSubmissionDate(submissions);
  const pacingStatus = buildPacingStatus({
    goalCompletion: goalViews && goalViews > 0 ? approvedViews / goalViews : null,
    start: periodStartForPacing,
    end: input.periodEnd ?? input.campaign.deadline,
    generatedAt,
  });
  const financial = buildFinancialSummary({
    totalBudget,
    budgetUsed,
    approvedViews,
    approvedPayableViews,
    approvedClips: approved.length,
    uniqueCreators,
    businessCpv,
    timeline,
    periodStart: periodStartForPacing,
    periodEnd: input.periodEnd ?? input.campaign.deadline,
    generatedAt,
  });
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
    generatedAt: toIso(generatedAt),
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
      creatorCpv,
      creatorCpm: creatorCpv * 1000,
      adminMargin,
      businessCpv,
      businessCpm: businessCpv * 1000,
      goalViews,
      goalViewsSource,
      minimumPaidViews: input.campaign.minimumPaidViews,
      maximumPaidViews: input.campaign.maximumPaidViews ?? null,
      startsAt: input.campaign.startsAt ? toIso(input.campaign.startsAt) : null,
      deadline: toIso(input.campaign.deadline),
      requirements: input.campaign.requirements ?? null,
      contentGuidelines: input.campaign.contentGuidelines ?? null,
      contentType: input.campaign.contentType ?? null,
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
      activeCreators: uniqueCreators,
      uniqueCreators,
      uniquePages,
      approvalRate: reviewed.length > 0 ? approved.length / reviewed.length : null,
      pacingStatus,
      statusCounts,
    },
    financial,
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
      contentType: true,
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
          normalizedPlatform: true,
          sourcePlatform: true,
          authorHandle: true,
          sourceConnectionType: true,
          sourceConnectionId: true,
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
      normalizedPlatform: submission.normalizedPlatform,
      sourcePlatform: submission.sourcePlatform,
      authorHandle: submission.authorHandle,
      sourceConnectionType: submission.sourceConnectionType,
      sourceConnectionId: submission.sourceConnectionId,
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
  const topClip = data.topContent[0];
  const recommendedCreators = data.creators.filter((creator) => creator.recommendedForNextCampaign).slice(0, 8);
  const hasCommunityData = data.referral.totalClicks > 0 || data.referral.inviteCount > 0 || data.referral.activeClipperCount > 0;
  const goalText = data.performance.goalCompletion == null
    ? "zonder vast viewdoel"
    : `${formatPercent(data.performance.goalCompletion)} van het viewdoel`;
  const cpmText = data.financial.effectiveCpm == null
    ? "n.v.t."
    : `${formatCurrencyValue(data.financial.effectiveCpm)} CPM`;
  const overdeliveryText = data.financial.overdeliveryViews > 0
    ? `${formatNumber(data.financial.overdeliveryViews)} extra views boven de betaalde viewbasis (${formatPercent(data.financial.overdeliveryRate ?? 0)} overdelivery)`
    : "Nog geen extra views boven de betaalde viewbasis in deze periode";

  const keyTakeaways = [
    `${data.campaign.brandName} behaalde ${formatNumber(data.performance.approvedViews)} goedgekeurde views, ${goalText}.`,
    topPlatform
      ? `${topPlatform.platform} leverde het grootste bereik met ${formatNumber(topPlatform.views)} goedgekeurde views en een effectieve CPM van ${topPlatform.effectiveCpm == null ? "n.v.t." : formatCurrencyValue(topPlatform.effectiveCpm)}.`
      : "Er is nog onvoldoende platformdata om een kanaalwinnaar te kiezen.",
    `De campagne had ${data.performance.uniqueCreators} unieke creators en ${data.performance.uniquePages} unieke pages met inzendingen.`,
    `De effectieve CPM kwam uit op ${cpmText}.`,
    overdeliveryText,
  ];

  const learnings = [
    topPlatform
      ? `Verdubbel op formats die op ${topPlatform.platform} vroeg aandacht trekken en snel de brand zichtbaar maken.`
      : "Zorg dat de eerste ronde clips voldoende platformvolume oplevert om duidelijke kanaallearnings te kunnen trekken.",
    topClip
      ? `Gebruik de beste clip van ${topClip.creator} als referentie voor hook, tempo en visuele brand placement.`
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
    "Controleer logo/brand placement, dubbele content en afwijkende engagementratio's voordat prestaties worden goedgekeurd.",
  ];
  const contentInsights = [
    topClip
      ? `Best presterende clip: ${topClip.platform}-clip van ${topClip.creator} met ${formatNumber(topClip.views)} goedgekeurde views. Gebruik de sterke eerste-seconde hook, native pacing en duidelijke productintegratie als referentie.`
      : "Er is nog geen topclip beschikbaar; voeg clip-level learnings toe zodra goedgekeurde content binnenkomt.",
    topPlatform
      ? `${topPlatform.platform} gaf het duidelijkste schaalsignaal. Gebruik dit als reach-kanaal en vergelijk andere platformen op engagementkwaliteit.`
      : "Contentpatronen per platform hebben meer goedgekeurde delivery nodig voordat er een stevige conclusie mogelijk is.",
  ];
  const platformRecommendations = Object.fromEntries(
    data.platformBreakdown.map((row) => [
      row.platform,
      `${row.platform} leverde ${formatNumber(row.views)} goedgekeurde views met ${row.clips} goedgekeurde clips en een effectieve CPM van ${row.effectiveCpm == null ? "n.v.t." : formatCurrencyValue(row.effectiveCpm)}.`,
    ]),
  );
  const creatorRecommendations = recommendedCreators.length > 0
    ? recommendedCreators.map((creator) => `Activeer ${creator.creator} opnieuw: ${formatNumber(creator.views)} goedgekeurde views, ${formatPercent(creator.approvalRate ?? 0)} goedkeuringspercentage.`)
    : ["Activeer creators opnieuw zodra er goedgekeurde delivery, schone kwaliteitsreview en sterke brand fit beschikbaar zijn."];
  const editorialContent: CampaignReportEditorialContent = {
    campaignType: data.campaign.contentType || "Awareness",
    financialNote: `Budget is alleen besteed aan goedgekeurde views. De huidige effectieve CPM is ${cpmText}. ${data.financial.unusedBudgetExplanation} ${data.financial.overdeliveryExplanation}`,
    contentInsights,
    topContentNotes: Object.fromEntries(
      data.topContent.slice(0, 8).map((clip) => [
        clip.id,
        `Werkte omdat de clip een native ${clip.platform}-format combineerde met snelle context en duidelijke brand-zichtbaarheid.`,
      ]),
    ),
    platformRecommendations,
    creatorRecommendations,
    qualityNote: data.quality.clientSummary,
    keyLearnings: learnings,
    nextCampaignPlan: nextCampaignRecommendations,
    appendixNote: "De appendix is gereserveerd voor ruwe operationele data wanneer een klant om onderbouwing vraagt.",
  };

  return {
    title: `${data.campaign.brandName} campagnerapport`,
    executiveSummary: `${data.campaign.brandName} behaalde ${formatNumber(data.performance.approvedViews)} goedgekeurde views met ${data.performance.approvedClips} goedgekeurde clips. ${topPlatform ? `${topPlatform.platform} was het sterkste bereikskanaal.` : "Er is nog geen duidelijke platformwinnaar."} ${data.financial.overdeliveryViews > 0 ? `Daarnaast leverde de campagne ${formatNumber(data.financial.overdeliveryViews)} views overdelivery boven de betaalde viewbasis.` : "Overdelivery wordt zichtbaar zodra goedgekeurde views boven de betaalde viewbasis uitkomen."} Voor de volgende campagne adviseren we de best presterende creators opnieuw te activeren, de winnende hooks expliciet in de brief te zetten en het budget te sturen op de laagste effectieve CPM.`,
    keyTakeaways,
    learnings,
    nextCampaignRecommendations,
    sectionSettings: { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS, communityActivation: hasCommunityData },
    editorialContent,
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
  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      averageViewsPerClip: row.clips > 0 ? Math.round(row.views / row.clips) : 0,
      effectiveCpv: row.views > 0 ? row.cost / row.views : null,
      effectiveCpm: row.views > 0 ? (row.cost / row.views) * 1000 : null,
      engagementRate: row.views > 0 ? row.engagement / row.views : null,
    }))
    .sort((a, b) => b.views - a.views);
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
  const rows = new Map<string, {
    creatorId: string;
    creator: string;
    submissions: number;
    approvedSubmissions: number;
    reviewedSubmissions: number;
    views: number;
    earnedAmount: number;
    flagged: number;
  }>();
  for (const submission of submissions) {
    const current = rows.get(submission.creatorId) ?? {
      creatorId: submission.creatorId,
      creator: submission.creatorLabel,
      submissions: 0,
      approvedSubmissions: 0,
      reviewedSubmissions: 0,
      views: 0,
      earnedAmount: 0,
      flagged: 0,
    };
    current.submissions += 1;
    if (["APPROVED", "REJECTED", "NEEDS_REVISION", "FLAGGED"].includes(submission.status)) {
      current.reviewedSubmissions += 1;
    }
    if (submission.status === "APPROVED") {
      current.approvedSubmissions += 1;
      current.views += submissionViews(submission);
      current.earnedAmount += toNumber(submission.earnedAmount);
    }
    current.flagged += submission.signals.some((signal) => !signal.resolvedAt && ["WARN", "CRITICAL"].includes(signal.severity)) ? 1 : 0;
    rows.set(submission.creatorId, current);
  }
  return Array.from(rows.values())
    .map((row) => {
      const approvalRate = row.reviewedSubmissions > 0 ? row.approvedSubmissions / row.reviewedSubmissions : null;
      const averageViewsPerApprovedClip = row.approvedSubmissions > 0 ? row.views / row.approvedSubmissions : null;
      const reliabilityStatus = creatorReliabilityStatus(approvalRate, row.flagged, row.views);
      return {
        creatorId: row.creatorId,
        creator: row.creator,
        submissions: row.submissions,
        views: row.views,
        earnedAmount: row.earnedAmount,
        flagged: row.flagged,
        approvalRate,
        averageViewsPerApprovedClip,
        reliabilityStatus,
        recommendedForNextCampaign: reliabilityStatus === "Aanbevolen",
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
}

function buildQualitySummary(submissions: CampaignReportSubmissionInput[]) {
  const signals = submissions.flatMap((submission) => submission.signals);
  const openSignals = signals.filter((signal) => !signal.resolvedAt && ["WARN", "CRITICAL"].includes(signal.severity));
  const qcReviews = submissions.flatMap((submission) => submission.qcReviews);
  const excluded = submissions.filter((submission) => ["REJECTED", "NEEDS_REVISION", "FLAGGED"].includes(submission.status));
  const excludedViews = excluded.reduce((sum, submission) => sum + submissionViews(submission), 0);
  const criticalSignals = openSignals.filter((signal) => signal.severity === "CRITICAL").length;
  const trafficQualityStatus = trafficQualityStatusFor({
    criticalSignals,
    openSignals: openSignals.length,
    excludedClips: excluded.length,
    resolvedSignals: signals.filter((signal) => Boolean(signal.resolvedAt)).length,
  });
  return {
    openSignals: openSignals.length,
    criticalSignals,
    signalCounts: countBy(openSignals, (signal) => signal.type),
    resolvedSignals: signals.filter((signal) => Boolean(signal.resolvedAt)).length,
    qcDecisionCounts: countBy(qcReviews, (review) => review.decision),
    approvedQcReviews: qcReviews.filter((review) => review.decision === "APPROVED").length,
    excludedClips: excluded.length,
    excludedViews,
    trafficQualityStatus,
    clientSummary: trafficQualityClientSummary(trafficQualityStatus, excluded.length),
  };
}

function buildAudienceSummary(snapshots: CampaignReportAudienceSnapshotInput[], campaign: CampaignReportCampaignInput) {
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
    fitStatus: audienceFitStatus({
      sampleCount: latest.length,
      topCountries: countryTotals,
      genderSplit,
      campaign,
    }),
  };
}

function buildFinancialSummary({
  totalBudget,
  budgetUsed,
  approvedViews,
  approvedPayableViews,
  approvedClips,
  uniqueCreators,
  businessCpv,
  timeline,
  periodStart,
  periodEnd,
  generatedAt,
}: {
  totalBudget: number;
  budgetUsed: number;
  approvedViews: number;
  approvedPayableViews: number;
  approvedClips: number;
  uniqueCreators: number;
  businessCpv: number;
  timeline: CampaignReportLiveData["timeline"];
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  generatedAt: Date | string;
}): CampaignReportLiveData["financial"] {
  const progress = periodProgress(periodStart, periodEnd, generatedAt);
  const forecastApprovedViews = progress && progress > 0 ? Math.round(approvedViews / progress) : null;
  const forecastBudgetUsed = progress && progress > 0 ? budgetUsed / progress : null;
  const overdeliveryViews = Math.max(0, approvedViews - approvedPayableViews);
  const overdeliveryRate = approvedPayableViews > 0 ? overdeliveryViews / approvedPayableViews : null;
  const overdeliveryValue = businessCpv > 0 ? overdeliveryViews * businessCpv : null;
  const overdeliveryExplanation = overdeliveryViews > 0
    ? `Overdelivery is extra bereik boven de views die volgens de CPM-spend zijn ingekocht. Door minimum- en maximum viewcaps per clip, budgetcaps en doorlopende organische views na het bereiken van het budget leverde deze campagne ${formatNumber(overdeliveryViews)} extra views op boven de betaalde viewbasis.`
    : "Overdelivery is extra bereik boven de views die volgens de CPM-spend zijn ingekocht. In deze periode is nog geen overdelivery boven de betaalde viewbasis zichtbaar.";
  return {
    totalBudget,
    budgetUsed,
    budgetRemaining: Math.max(0, totalBudget - budgetUsed),
    approvedPayableViews,
    overdeliveryViews,
    overdeliveryRate,
    overdeliveryValue,
    effectiveCpv: approvedViews > 0 ? budgetUsed / approvedViews : null,
    effectiveCpm: approvedViews > 0 ? (budgetUsed / approvedViews) * 1000 : null,
    costPerApprovedClip: approvedClips > 0 ? budgetUsed / approvedClips : null,
    costPerActiveCreator: uniqueCreators > 0 ? budgetUsed / uniqueCreators : null,
    forecastApprovedViews: timeline.length >= 2 ? forecastApprovedViews : null,
    forecastBudgetUsed: timeline.length >= 2 ? forecastBudgetUsed : null,
    unusedBudgetExplanation: totalBudget > budgetUsed
      ? "Er bleef budget beschikbaar omdat alleen goedgekeurde campagneprestaties meetellen voor uitbetaling."
      : "Het campagnebudget is volledig toegewezen aan goedgekeurde prestaties.",
    overdeliveryExplanation,
  };
}

function buildPacingStatus({
  goalCompletion,
  start,
  end,
  generatedAt,
}: {
  goalCompletion: number | null;
  start?: Date | string | null;
  end?: Date | string | null;
  generatedAt: Date | string;
}): CampaignReportPacingStatus {
  const progress = periodProgress(start, end, generatedAt);
  if (goalCompletion == null || progress == null) return "Tijdschema ontbreekt";
  if (goalCompletion >= progress + 0.08) return "Voor op schema";
  if (goalCompletion <= progress - 0.08) return "Achter op schema";
  return "Op schema";
}

function periodProgress(start: Date | string | null | undefined, end: Date | string | null | undefined, generatedAt: Date | string) {
  if (!start || !end) return null;
  const startMs = toDate(start).getTime();
  const endMs = toDate(end).getTime();
  const currentMs = toDate(generatedAt).getTime();
  const duration = endMs - startMs;
  if (duration <= 0) return null;
  return Math.min(1, Math.max(0, (currentMs - startMs) / duration));
}

function creatorReliabilityStatus(
  approvalRate: number | null,
  flagged: number,
  views: number,
): "Aanbevolen" | "Monitoren" | "Controleren" {
  if (flagged > 0 || (approvalRate != null && approvalRate < 0.5)) return "Controleren";
  if (views > 0 && (approvalRate == null || approvalRate >= 0.75)) return "Aanbevolen";
  return "Monitoren";
}

function trafficQualityStatusFor({
  criticalSignals,
  openSignals,
  excludedClips,
  resolvedSignals,
}: {
  criticalSignals: number;
  openSignals: number;
  excludedClips: number;
  resolvedSignals: number;
}): CampaignReportTrafficQualityStatus {
  if (criticalSignals > 0) return "Aandacht nodig";
  if (openSignals > 0 || excludedClips > 0 || resolvedSignals > 0) return "Goedgekeurd met uitsluitingen";
  return "Goedgekeurd";
}

function trafficQualityClientSummary(status: CampaignReportTrafficQualityStatus, excludedClips: number) {
  if (status === "Aandacht nodig") {
    return "De kwaliteit van het verkeer wordt beoordeeld voordat prestaties meetellen voor rapportage of uitbetaling.";
  }
  if (status === "Goedgekeurd met uitsluitingen") {
    return `${excludedClips} clip${excludedClips === 1 ? "" : "s"} of viewbron${excludedClips === 1 ? "" : "nen"} is uitgesloten of gemonitord na kwaliteitscontrole. Alleen goedgekeurde prestaties zijn opgenomen.`;
  }
  return "Alle betaalbare views zijn gecontroleerd op verkeerskwaliteit, dubbele activiteit, engagementratio's en campagnevoorwaarden.";
}

function audienceFitStatus({
  sampleCount,
  topCountries,
  genderSplit,
  campaign,
}: {
  sampleCount: number;
  topCountries: Record<string, number>;
  genderSplit: Record<string, number>;
  campaign: CampaignReportCampaignInput;
}): CampaignReportAudienceFitStatus {
  if (sampleCount === 0) return "Onvoldoende data";
  const scores: number[] = [];
  if (campaign.targetCountry && campaign.targetCountryPercent != null) {
    const targetShare = topCountries[campaign.targetCountry.toUpperCase()] ?? topCountries[campaign.targetCountry] ?? 0;
    scores.push(targetShare / Math.max(1, campaign.targetCountryPercent));
  }
  if (campaign.targetMalePercent != null) {
    const maleShare = genderSplit.male ?? genderSplit.MALE ?? 0;
    scores.push(1 - Math.abs(maleShare - campaign.targetMalePercent) / 100);
  }
  if (scores.length === 0) return "Onvoldoende data";
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  if (average >= 0.9) return "Sterke match";
  if (average >= 0.7) return "Gedeeltelijke match";
  return "Verbetering nodig";
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
  return Number(latest?.viewCount ?? submission.viewCount ?? submission.claimedViews ?? submission.eligibleViews ?? 0);
}

function submissionPayableViews(submission: CampaignReportSubmissionInput) {
  if (submission.eligibleViews != null) {
    return Math.max(0, Math.round(Number(submission.eligibleViews) || 0));
  }
  return submissionViews(submission);
}

function paidViewBasis({
  submissions,
  budgetUsed,
  businessCpv,
}: {
  submissions: CampaignReportSubmissionInput[];
  budgetUsed: number;
  businessCpv: number;
}) {
  if (businessCpv > 0) {
    return Math.max(0, Math.round(budgetUsed / businessCpv));
  }
  return submissions.reduce((sum, submission) => sum + submissionPayableViews(submission), 0);
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
  return (
    platformLabelIfKnown(submission.normalizedPlatform) ??
    platformLabelIfKnown(submission.sourcePlatform) ??
    inferPlatformFromUrl(submission.postUrl) ??
    platformLabelIfKnown(latestSnapshot(submission)?.source) ??
    "Onbekend"
  );
}

function platformLabel(value: string | null | undefined) {
  if (!value) return "Onbekend";
  return PLATFORM_LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function platformLabelIfKnown(value: string | null | undefined) {
  if (!value || value === "OAUTH_FAILED") return null;
  return PLATFORM_LABELS[value] ?? null;
}

function inferPlatformFromUrl(postUrl: string | null | undefined) {
  const url = safeUrl(postUrl);
  const host = url?.hostname.replace(/^www\./, "").toLowerCase() ?? "";
  if (!host) return null;
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("tiktok.com")) return "TikTok";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube Shorts";
  if (host.includes("facebook.com") || host.includes("fb.watch")) return "Facebook";
  return null;
}

function countUniquePages(submissions: CampaignReportSubmissionInput[]) {
  const pages = new Set<string>();
  for (const submission of submissions) {
    const identity = pageIdentity(submission);
    if (identity) pages.add(identity);
  }
  return pages.size;
}

function pageIdentity(submission: CampaignReportSubmissionInput) {
  if (submission.sourceConnectionType && submission.sourceConnectionId) {
    return `${submission.sourceConnectionType}:${submission.sourceConnectionId}`;
  }

  const handle = normalizeHandle(submission.authorHandle) ?? pageHandleFromUrl(submission.postUrl);
  if (!handle) return null;
  return `${inferPlatform(submission)}:${handle}`;
}

function normalizeHandle(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/^@/, "").toLowerCase() ?? "";
  return trimmed || null;
}

function pageHandleFromUrl(postUrl: string | null | undefined) {
  const url = safeUrl(postUrl);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  const first = normalizeHandle(segments[0]);
  if (!first) return null;

  if (host.includes("tiktok.com") && first.startsWith("@")) return normalizeHandle(first);
  if (host.includes("tiktok.com") && segments[0]?.startsWith("@")) return normalizeHandle(segments[0]);
  if (host.includes("youtube.com")) {
    if (segments[0]?.startsWith("@")) return normalizeHandle(segments[0]);
    if (segments[0] === "channel" && segments[1]) return normalizeHandle(segments[1]);
  }
  if (host.includes("instagram.com") && !["p", "reel", "reels", "tv", "stories"].includes(first)) {
    return first;
  }
  if (host.includes("facebook.com") && !["watch", "reel", "reels", "videos"].includes(first)) {
    return first;
  }
  return null;
}

function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function calculateBudgetGoalViews(totalBudget: number, businessCpv: number) {
  if (totalBudget <= 0 || businessCpv <= 0) return null;
  return Math.max(1, Math.round(totalBudget / businessCpv));
}

function firstSubmissionDate(submissions: CampaignReportSubmissionInput[]) {
  const first = submissions
    .map((submission) => toDate(submission.createdAt))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return first ?? null;
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

function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
