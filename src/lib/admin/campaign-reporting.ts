import { calculateCampaignReferralReport, type CampaignReferralReport } from "@/lib/campaign-referrals";
import {
  DEFAULT_CAMPAIGN_REPORT_SECTIONS,
  DEFAULT_AUDIENCE_INSIGHT_TEMPLATE,
  normalizeEditorialContent,
  type CampaignReportEditorial,
  type CampaignReportSectionSettings,
} from "@/lib/admin/campaign-report-shared";
import { calculateCampaignDelivery, submissionLiveViews } from "@/lib/campaign-delivery";
import { parseClipUrl } from "@/lib/parse-clip-url";
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
  YOUTUBE: "YouTube Shorts",
};

const INTERNAL_METRIC_SOURCES = new Set(["OAUTH_FAILED"]);

const AUDIENCE_PLATFORM_LABELS: Record<string, string> = {
  IG: "Instagram",
  TT: "TikTok",
  YT: "YouTube",
  FB: "Facebook",
};

const CLIENT_HIDDEN_AUDIENCE_COUNTRY_CODES = new Set([
  "AF",
  "AM",
  "AZ",
  "BH",
  "BD",
  "BT",
  "BN",
  "KH",
  "CN",
  "GE",
  "HK",
  "IN",
  "ID",
  "IR",
  "IQ",
  "JP",
  "JO",
  "KZ",
  "KW",
  "KG",
  "LA",
  "LB",
  "MO",
  "MY",
  "MV",
  "MN",
  "MM",
  "NP",
  "KP",
  "OM",
  "PK",
  "PS",
  "PH",
  "QA",
  "SA",
  "SG",
  "KR",
  "LK",
  "SY",
  "TW",
  "TJ",
  "TH",
  "TL",
  "TM",
  "AE",
  "UZ",
  "VN",
  "YE",
]);

export interface CampaignReportCampaignInput {
  id: string;
  name: string;
  description?: string | null;
  bannerUrl?: string | null;
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
    bannerUrl: string | null;
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
    currentViews: number;
    targetViews: number | null;
    targetViewsSource: "budget_cpm" | "legacy_goal" | "none";
    paidEligibleViews: number;
    overdeliveryViews: number;
    overdeliveryPercent: number | null;
    deliveryProgress: number | null;
    cpmPerThousand: number | null;
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
    averageViewsPerClip: number;
    engagementRate: number | null;
    effectiveCpm: number | null;
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
    approvedSubmissions: number;
    views: number;
    earnedAmount: number;
    flagged: number;
    approvalRate: number | null;
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
    sourcePlatforms: string[];
    platformsLabel: string;
    ageBuckets: Record<string, number>;
    genderSplit: Record<string, number>;
    topCountries: Array<{ code: string; share: number }>;
  };
  defaults: CampaignReportEditorial;
}

export function buildCampaignReportLiveData(input: CampaignReportBuildInput): CampaignReportLiveData {
  const totalBudget = toNumber(input.campaign.totalBudget);
  const creatorCpv = toNumber(input.campaign.creatorCpv);
  const legacyGoalViews = input.campaign.goalViews == null ? null : Number(input.campaign.goalViews);
  const submissions = input.submissions;
  const approved = submissions.filter((submission) => submission.status === "APPROVED");
  const reviewed = submissions.filter((submission) => ["APPROVED", "REJECTED", "NEEDS_REVISION", "FLAGGED"].includes(submission.status));
  const delivery = calculateCampaignDelivery({
    campaign: { totalBudget, creatorCpv, goalViews: legacyGoalViews },
    submissions,
  });
  const approvedViews = delivery.currentViews;
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
      bannerUrl: input.campaign.bannerUrl ?? null,
      platforms: input.campaign.platforms.map(platformLabel),
      totalBudget,
      creatorCpv,
      adminMargin: toNumber(input.campaign.adminMargin),
      businessCpv: creatorCpv,
      goalViews: delivery.targetViews,
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
      currentViews: delivery.currentViews,
      targetViews: delivery.targetViews,
      targetViewsSource: delivery.targetViewsSource,
      paidEligibleViews: delivery.paidEligibleViews,
      overdeliveryViews: delivery.overdeliveryViews,
      overdeliveryPercent: delivery.overdeliveryPercent,
      deliveryProgress: delivery.deliveryProgress,
      cpmPerThousand: delivery.cpmPerThousand,
      goalCompletion: delivery.deliveryProgress,
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
      bannerUrl: true,
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
    ? "zonder betrouwbaar viewdoel"
    : `${formatPercent(data.performance.goalCompletion)} van de doelviews`;
  const overdeliveryText = data.performance.overdeliveryViews > 0
    ? ` Daarnaast leverde de campagne ${formatNumber(data.performance.overdeliveryViews)} views overdelivery als gratis extra bereik voor de klant.`
    : "";
  const qualityText = data.quality.criticalSignals === 0
    ? "zonder open kritieke kwaliteitsissues"
    : `met ${data.quality.criticalSignals} kritieke signalen die aandacht vragen`;
  const cpvText = data.performance.costPerThousandViews == null
    ? "n.v.t."
    : `EUR ${data.performance.costPerThousandViews.toFixed(2)} per 1.000 views`;

  const keyTakeaways = [
    `${data.campaign.brandName} behaalde ${formatNumber(data.performance.currentViews)} huidige goedgekeurde views, ${goalText}.${overdeliveryText}`,
    data.performance.targetViews
      ? `De doelviews waren ${formatNumber(data.performance.targetViews)}, berekend uit budget en CPM.`
      : "Er is geen betrouwbaar berekend viewdoel beschikbaar voor deze campagne.",
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
  const defaultTemplateBlocks = {
    "cover.kicker": "Campagne prestatierapport",
    "summary.body": "De campagne heeft het afgesproken doel van {{performance.targetViews}} views ruim overtroffen. In totaal genereerden goedgekeurde clips {{performance.currentViews}} views, goed voor {{performance.overdeliveryViews}} extra views boven het afgesproken doel. Het volledige budget van {{campaign.totalBudget}} is benut, waardoor de effectieve CPM op het totale bereik uitkomt op {{performance.costPerThousandViews}}. De best presterende content kwam voort uit snelle hooks, duidelijke merkherkenning en een platform-native editstijl.",
    "summary.conclusion": "Dit betekent dat de campagne het afgesproken bereik ruim heeft overtroffen zonder extra mediabudget.",
    "glance.statement": "De campagne leverde extra bereik boven het afgesproken doel. Extra bereik wordt niet extra doorbelast en blijft zichtbaar als gratis bonus voor de klant.",
    "performance.insight": "De groei laat zien wanneer de campagne tractie kreeg. Sterke clipmomenten versnellen de cumulatieve viewlijn en vormen de basis voor optimalisatie in de volgende ronde.",
    "content.insight": "De best presterende clips combineren een snelle hook, zichtbare merkplaatsing in de eerste seconden en een editstijl die natuurlijk voelt voor het platform.",
    "platform.insight": "{{platformBreakdown[0].platform}} leverde het grootste deel van het bereik en verdient extra focus in de volgende campagne.",
    "creator.insight": "Voor de volgende campagne raden we aan creators opnieuw te activeren die hoge views combineren met consistente kwaliteit en duidelijke merkfit.",
    "audience.insight": DEFAULT_AUDIENCE_INSIGHT_TEMPLATE,
    "budget.insight": "Betaalde views zijn gemaximeerd op het afgesproken doel. Extra views boven dit doel worden gerapporteerd als extra bereik zonder extra kosten.",
    "quality.insight": "Alle clips en views zijn gecontroleerd op campagnevoorwaarden, dubbele activiteit en verkeerskwaliteit. Alleen prestaties die voldeden aan de voorwaarden zijn meegenomen in de goedgekeurde resultaten.",
    "next.plan": "Voor de volgende campagne adviseren we om de best presterende creators opnieuw te activeren, de winnende hooks expliciet in de briefing te zetten en budget te sturen naar de kanalen met de laagste effectieve CPM.",
  };

  return {
    title: `${data.campaign.brandName} campagnerapport`,
    executiveSummary: `${data.campaign.brandName} behaalde ${formatNumber(data.performance.currentViews)} huidige goedgekeurde views met ${data.performance.approvedClips} goedgekeurde clips. ${data.performance.targetViews ? `Het afgesproken doel was ${formatNumber(data.performance.targetViews)} views.` : ""}${overdeliveryText} ${topPlatform ? `${topPlatform.platform} was het sterkste bereikskanaal.` : "Er is nog geen duidelijke platformwinnaar."} Voor de volgende campagne adviseren we de best presterende creators opnieuw te activeren, de winnende hooks expliciet in de brief te zetten en het budget te verschuiven naar de kanalen met de laagste CPM.`,
    keyTakeaways,
    learnings,
    nextCampaignRecommendations,
    sectionSettings: { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS },
    editorialContent: normalizeEditorialContent({
      templateBlocks: defaultTemplateBlocks,
      contentPatternTags: [
        "snelle hook",
        "platform-native editstijl",
        "merk zichtbaar in eerste 3 seconden",
        "probleem/oplossing",
        "duidelijke productintegratie",
      ],
      topContentNotes: {},
      platformRecommendations: {},
      creatorRecommendations: nextCampaignRecommendations.slice(0, 3),
      qualityNote: defaultTemplateBlocks["quality.insight"],
      nextCampaignPlan: defaultTemplateBlocks["next.plan"],
      coverImageUrl: null,
    }),
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
    .filter((row) => row.platform !== "Unknown")
    .map((row) => ({
      ...row,
      averageViewsPerClip: row.clips > 0 ? row.views / row.clips : 0,
      engagementRate: row.views > 0 ? row.engagement / row.views : null,
      effectiveCpm: row.views > 0 ? (row.cost / row.views) * 1000 : null,
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
  const rows = new Map<string, { creatorId: string; creator: string; submissions: number; approvedSubmissions: number; views: number; earnedAmount: number; flagged: number }>();
  for (const submission of submissions) {
    const current = rows.get(submission.creatorId) ?? {
      creatorId: submission.creatorId,
      creator: submission.creatorLabel,
      submissions: 0,
      approvedSubmissions: 0,
      views: 0,
      earnedAmount: 0,
      flagged: 0,
    };
    current.submissions += 1;
    if (submission.status === "APPROVED") {
      current.approvedSubmissions += 1;
      current.views += submissionViews(submission);
      current.earnedAmount += toNumber(submission.earnedAmount);
    }
    current.flagged += submission.signals.some((signal) => !signal.resolvedAt && ["WARN", "CRITICAL"].includes(signal.severity)) ? 1 : 0;
    rows.set(submission.creatorId, current);
  }
  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      approvalRate: row.submissions > 0 ? row.approvedSubmissions / row.submissions : null,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
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
  const latest = preferredAudienceSnapshots(snapshots);
  const ageBuckets: Record<string, number> = {};
  const genderSplit: Record<string, number> = {};
  const countryTotals: Record<string, number> = {};
  let ageSampleCount = 0;
  let genderSampleCount = 0;
  let countrySampleCount = 0;

  for (const snapshot of latest) {
    const normalizedAgeBuckets = normalizeAudienceMap(snapshot.ageBuckets);
    if (Object.keys(normalizedAgeBuckets).length > 0) {
      ageSampleCount++;
      for (const [bucket, value] of Object.entries(normalizedAgeBuckets)) {
        ageBuckets[bucket] = (ageBuckets[bucket] ?? 0) + value;
      }
    }

    const normalizedGenderSplit = normalizeAudienceMap(snapshot.genderSplit);
    if (Object.keys(normalizedGenderSplit).length > 0) {
      genderSampleCount++;
      for (const [bucket, value] of Object.entries(normalizedGenderSplit)) {
        genderSplit[bucket] = (genderSplit[bucket] ?? 0) + value;
      }
    }

    const normalizedCountries = normalizeCountryShares(snapshot.topCountries);
    if (normalizedCountries.length > 0) {
      countrySampleCount++;
      for (const country of normalizedCountries) {
        countryTotals[country.code] = (countryTotals[country.code] ?? 0) + country.share;
      }
    }
  }

  return {
    sampleCount: latest.length,
    sourcePlatforms: audienceSourcePlatforms(latest),
    platformsLabel: formatDutchList(audienceSourcePlatforms(latest)),
    ageBuckets: averageAudienceMap(ageBuckets, ageSampleCount),
    genderSplit: averageAudienceMap(genderSplit, genderSampleCount),
    topCountries: Object.entries(countryTotals)
      .map(([code, share]) => ({ code, share: countrySampleCount > 0 ? share / countrySampleCount : 0 }))
      .filter((country) => !CLIENT_HIDDEN_AUDIENCE_COUNTRY_CODES.has(country.code.trim().toUpperCase()))
      .sort((a, b) => b.share - a.share)
      .slice(0, 8)
  };
}

function audienceSourcePlatforms(snapshots: CampaignReportAudienceSnapshotInput[]) {
  return Array.from(
    new Set(
      snapshots
        .map((snapshot) => AUDIENCE_PLATFORM_LABELS[snapshot.connectionType] ?? null)
        .filter((platform): platform is string => Boolean(platform)),
    ),
  );
}

function formatDutchList(items: string[]) {
  if (items.length === 0) return "beschikbare platformen";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} en ${items[items.length - 1]}`;
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

function preferredAudienceSnapshots(snapshots: CampaignReportAudienceSnapshotInput[]) {
  const latestByKind = latestAudienceSnapshots(snapshots);
  const byConnection = new Map<string, CampaignReportAudienceSnapshotInput[]>();
  for (const snapshot of latestByKind) {
    const key = `${snapshot.connectionType}:${snapshot.connectionId}`;
    const rows = byConnection.get(key) ?? [];
    rows.push(snapshot);
    byConnection.set(key, rows);
  }

  return Array.from(byConnection.values()).map((rows) => {
    const engaged = rows.find((snapshot) => snapshot.kind === "ENGAGED" && hasAudienceData(snapshot));
    if (engaged) return engaged;
    return rows.find(hasAudienceData) ?? rows[0];
  });
}

function hasAudienceData(snapshot: CampaignReportAudienceSnapshotInput) {
  return (
    Object.keys(snapshot.ageBuckets ?? {}).length > 0 ||
    Object.keys(snapshot.genderSplit ?? {}).length > 0 ||
    (snapshot.topCountries ?? []).length > 0
  );
}

function normalizeAudienceMap(input?: Record<string, number> | null) {
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    const share = normalizeAudienceShare(value);
    if (share > 0) normalized[key] = share;
  }
  return normalized;
}

function normalizeCountryShares(input?: Array<{ code: string; share: number }> | null) {
  return (input ?? [])
    .map((country) => ({ code: country.code, share: normalizeAudienceShare(country.share) }))
    .filter((country) => country.code && country.share > 0);
}

function normalizeAudienceShare(value: number) {
  const numeric = Number(value) || 0;
  if (numeric <= 0) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

function averageAudienceMap(input: Record<string, number>, sampleCount: number) {
  if (sampleCount <= 0) return input;
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value / sampleCount]),
  );
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
  return submissionLiveViews(submission);
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
  return platformLabel(
    clientFacingPlatformSource(snapshotSource) ??
      clientFacingPlatformSource(submission.sourcePlatform) ??
      parseClipUrl(submission.postUrl).normalizedPlatform ??
      "UNKNOWN",
  );
}

function platformLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return PLATFORM_LABELS[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function clientFacingPlatformSource(value: string | null | undefined) {
  if (!value || INTERNAL_METRIC_SOURCES.has(value)) return null;
  return PLATFORM_LABELS[value] ? value : null;
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
