import { prisma } from "@/lib/prisma";
import type { CampaignStatus, PayoutStatus, SignalSeverity, SignalType, SubmissionStatus } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export const PIPELINE_CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "pending_payment", "pending_review"];
export const LIVE_OPERATING_AREAS = new Set([
  "CEO Dashboard",
  "Brand CRM",
  "Brand Onboarding",
  "Clipper Database",
  "Recruitment Pipeline",
  "Content Production",
  "Quality Control",
  "Payouts",
  "SOP Library",
  "Weekly KPI Review",
]);

export interface AgencyOsDateWindows {
  todayStart: Date;
  weekStart: Date;
  monthStart: Date;
  nextMonthStart: Date;
  followingMonthStart: Date;
}

export interface AgencyCampaignMetricInput {
  status: CampaignStatus;
  totalBudget: number | string | { toString(): string } | null;
  createdAt: Date;
  deadline: Date;
}

export interface AgencySubmissionMetricInput {
  status: SubmissionStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  earnedAmount: number | string | { toString(): string } | null;
}

export interface AgencyPayoutMetricInput {
  status: PayoutStatus;
  amount: number | string | { toString(): string } | null;
}

export interface AgencyOsCalculationInput {
  now: Date;
  campaigns: AgencyCampaignMetricInput[];
  submissions: AgencySubmissionMetricInput[];
  payouts: AgencyPayoutMetricInput[];
  verifiedConnectionCreatorIds: Array<string | null>;
  activeApplicationCreatorIds: Array<string | null>;
  openRiskSignals: number;
  criticalRiskSignals: number;
  tokenBrokenSignals: number;
}

export interface AgencyOsMetrics {
  totalRevenueThisMonth: number;
  expectedRevenueNextMonth: number;
  bookedCampaignBudget: number;
  activeBrands: number;
  pipelineBrands: number;
  activeClippers: number;
  clipsDeliveredThisWeek: number;
  clipsApprovedThisWeek: number;
  clipsRejectedOrRevisedThisWeek: number;
  clipsNeedsReview: number;
  approvalRate: number | null;
  payoutsOwed: number;
  creatorEarnings: number;
  estimatedGrossProfit: number;
  openRiskSignals: number;
  criticalRiskSignals: number;
  tokenBrokenSignals: number;
}

export type OperatingAreaStatus = "live" | "manual";

export interface OperatingArea {
  name: string;
  status: OperatingAreaStatus;
  detail: string;
  href?: string;
}

export interface DeliveryRiskItem {
  id: string;
  name: string;
  deadline: Date;
  captured: number;
  goal: number;
  pct: number;
}

export interface TopClipperItem {
  profileId: string | null;
  displayName: string;
  email: string | null;
  score: number | null;
  sampleSize: number | null;
}

export interface RecentRiskSignal {
  id: string;
  submissionId: string;
  type: SignalType;
  severity: SignalSeverity;
  createdAt: Date;
  campaignName: string | null;
  creatorEmail: string | null;
}

export interface AgencyOsDashboardSnapshot {
  metrics: AgencyOsMetrics;
  operatingAreas: OperatingArea[];
  deliveryRisks: DeliveryRiskItem[];
  topClippers: TopClipperItem[];
  recentRiskSignals: RecentRiskSignal[];
}

export function getAgencyOsDateWindows(now: Date): AgencyOsDateWindows {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart.getTime() - 7 * DAY_MS);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const nextMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
  const followingMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() + 2, 1);

  return { todayStart, weekStart, monthStart, nextMonthStart, followingMonthStart };
}

export function toNumber(value: number | string | { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateApprovalRate(approved: number, rejectedOrRevised: number): number | null {
  const reviewed = approved + rejectedOrRevised;
  return reviewed > 0 ? (approved / reviewed) * 100 : null;
}

export function buildOperatingAreas(): OperatingArea[] {
  const areas: Array<Omit<OperatingArea, "status">> = [
    { name: "CEO Dashboard", detail: "Live executive KPIs from the app", href: "/admin" },
    { name: "Brand CRM", detail: "Lead pipeline, follow-ups, owner, and value", href: "/admin/crm" },
    { name: "Brand Onboarding", detail: "Contract, payment, brief, assets, and assigned clippers", href: "/admin/onboarding" },
    { name: "Clipper Database", detail: "Creator profiles, operations, capacity, and assigned brands", href: "/admin/clippers" },
    { name: "Recruitment Pipeline", detail: "Candidates, trials, scores, and approvals", href: "/admin/recruitment" },
    { name: "Content Production", detail: "Assignments, due dates, revisions, and submissions", href: "/admin/production" },
    { name: "Quality Control", detail: "Scorecards, logo review, approvals, and signals", href: "/admin/review" },
    { name: "Payouts", detail: "Creator payout obligations and history", href: "/admin/payouts" },
    { name: "Pricing", detail: "Manual package model; campaign CPV exists" },
    { name: "Contracts", detail: "Manual document tracker; no contract model yet" },
    { name: "SOP Library", detail: "Searchable operating procedures with review owners", href: "/admin/sops" },
    { name: "Weekly KPI Review", detail: "Derived founder review numbers from live data", href: "/admin" },
  ];

  return areas.map((area) => ({
    ...area,
    status: LIVE_OPERATING_AREAS.has(area.name) ? "live" : "manual",
  }));
}

export function calculateAgencyOsMetrics(input: AgencyOsCalculationInput): AgencyOsMetrics {
  const windows = getAgencyOsDateWindows(input.now);
  const nonCancelledCampaigns = input.campaigns.filter((campaign) => campaign.status !== "cancelled");
  const isThisMonth = (date: Date) => date >= windows.monthStart && date < windows.nextMonthStart;
  const isNextMonth = (date: Date) => date >= windows.nextMonthStart && date < windows.followingMonthStart;
  const isThisWeek = (date: Date) => date >= windows.weekStart && date <= input.now;

  const totalRevenueThisMonth = nonCancelledCampaigns
    .filter((campaign) => isThisMonth(campaign.createdAt))
    .reduce((sum, campaign) => sum + toNumber(campaign.totalBudget), 0);

  const expectedRevenueNextMonth = nonCancelledCampaigns
    .filter((campaign) => isNextMonth(campaign.deadline))
    .reduce((sum, campaign) => sum + toNumber(campaign.totalBudget), 0);

  const bookedCampaignBudget = nonCancelledCampaigns.reduce(
    (sum, campaign) => sum + toNumber(campaign.totalBudget),
    0,
  );

  const creatorEarnings = input.submissions
    .filter((submission) => submission.status === "APPROVED")
    .reduce((sum, submission) => sum + toNumber(submission.earnedAmount), 0);

  const payoutsOwed = input.payouts
    .filter((payout) => payout.status !== "confirmed")
    .reduce((sum, payout) => sum + toNumber(payout.amount), 0);

  const activeClipperIds = new Set(
    [...input.verifiedConnectionCreatorIds, ...input.activeApplicationCreatorIds].filter(
      (id): id is string => Boolean(id),
    ),
  );

  const weeklySubmissions = input.submissions.filter((submission) => isThisWeek(submission.createdAt));
  const clipsApprovedThisWeek = input.submissions.filter(
    (submission) =>
      submission.status === "APPROVED" && isThisWeek(submission.reviewedAt ?? submission.createdAt),
  ).length;
  const clipsRejectedOrRevisedThisWeek = input.submissions.filter(
    (submission) =>
      (submission.status === "REJECTED" || submission.status === "FLAGGED" || submission.status === "NEEDS_REVISION") &&
      isThisWeek(submission.reviewedAt ?? submission.createdAt),
  ).length;

  return {
    totalRevenueThisMonth,
    expectedRevenueNextMonth,
    bookedCampaignBudget,
    activeBrands: input.campaigns.filter((campaign) => campaign.status === "active").length,
    pipelineBrands: input.campaigns.filter((campaign) => PIPELINE_CAMPAIGN_STATUSES.includes(campaign.status)).length,
    activeClippers: activeClipperIds.size,
    clipsDeliveredThisWeek: weeklySubmissions.length,
    clipsApprovedThisWeek,
    clipsRejectedOrRevisedThisWeek,
    clipsNeedsReview: input.submissions.filter((submission) => submission.status === "PENDING").length,
    approvalRate: calculateApprovalRate(clipsApprovedThisWeek, clipsRejectedOrRevisedThisWeek),
    payoutsOwed,
    creatorEarnings,
    estimatedGrossProfit: bookedCampaignBudget - creatorEarnings - payoutsOwed,
    openRiskSignals: input.openRiskSignals,
    criticalRiskSignals: input.criticalRiskSignals,
    tokenBrokenSignals: input.tokenBrokenSignals,
  };
}

async function loadCampaignsAtRisk(now: Date): Promise<DeliveryRiskItem[]> {
  const in7d = new Date(now);
  in7d.setDate(in7d.getDate() + 7);

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "active",
      deadline: { lte: in7d },
    },
    select: {
      id: true,
      name: true,
      goalViews: true,
      deadline: true,
      campaignSubmissions: {
        where: { status: "APPROVED" },
        select: { eligibleViews: true },
      },
    },
    take: 50,
  });

  return campaigns
    .map((campaign) => {
      const captured = campaign.campaignSubmissions.reduce(
        (sum, submission) => sum + (submission.eligibleViews ?? 0),
        0,
      );
      const goal = campaign.goalViews ? Number(campaign.goalViews) : 0;
      const pct = goal > 0 ? captured / goal : 1;
      return { id: campaign.id, name: campaign.name, deadline: campaign.deadline, captured, goal, pct };
    })
    .filter((campaign) => campaign.goal === 0 || campaign.pct < 0.7)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);
}

async function loadTopClippers(): Promise<TopClipperItem[]> {
  const scores = await prisma.clipperPerformanceScore.findMany({
    orderBy: [{ score: "desc" }, { computedAt: "desc" }],
    take: 50,
  });

  const seen = new Set<string>();
  const topScores = [];
  for (const score of scores) {
    if (seen.has(score.creatorProfileId)) continue;
    seen.add(score.creatorProfileId);
    topScores.push(score);
    if (topScores.length >= 5) break;
  }

  if (topScores.length === 0) return [];

  const profiles = await prisma.creatorProfile.findMany({
    where: { id: { in: topScores.map((score) => score.creatorProfileId) } },
    select: { id: true, displayName: true, user: { select: { email: true } } },
  });
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  return topScores.map((score) => {
    const profile = byId.get(score.creatorProfileId);
    return {
      profileId: profile?.id ?? null,
      displayName: profile?.displayName ?? "Unknown creator",
      email: profile?.user?.email ?? null,
      score: score.score,
      sampleSize: score.sampleSize,
    };
  });
}

async function loadRecentRiskSignals(): Promise<RecentRiskSignal[]> {
  const signals = await prisma.submissionSignal.findMany({
    where: {
      resolvedAt: null,
      severity: { in: ["WARN", "CRITICAL"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      submissionId: true,
      type: true,
      severity: true,
      createdAt: true,
      submission: {
        select: {
          campaign: { select: { name: true } },
          creator: { select: { email: true } },
        },
      },
    },
  });

  return signals.map((signal) => ({
    id: signal.id,
    submissionId: signal.submissionId,
    type: signal.type,
    severity: signal.severity,
    createdAt: signal.createdAt,
    campaignName: signal.submission?.campaign?.name ?? null,
    creatorEmail: signal.submission?.creator?.email ?? null,
  }));
}

export async function getAgencyOsDashboardSnapshot(now = new Date()): Promise<AgencyOsDashboardSnapshot> {
  const [
    campaigns,
    submissions,
    payouts,
    igConnections,
    ttConnections,
    ytConnections,
    fbConnections,
    activeApplications,
    openRiskSignals,
    criticalRiskSignals,
    tokenBrokenSignals,
    deliveryRisks,
    topClippers,
    recentRiskSignals,
  ] = await Promise.all([
    prisma.campaign.findMany({
      select: {
        status: true,
        totalBudget: true,
        createdAt: true,
        deadline: true,
      },
    }),
    prisma.campaignSubmission.findMany({
      select: {
        status: true,
        createdAt: true,
        reviewedAt: true,
        earnedAmount: true,
      },
    }),
    prisma.payout.findMany({
      select: {
        status: true,
        amount: true,
      },
    }),
    prisma.creatorIgConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.creatorYtConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.creatorFbConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.campaignApplication.findMany({ where: { status: "active" }, select: { creatorProfileId: true } }),
    prisma.submissionSignal.count({ where: { resolvedAt: null, severity: { in: ["WARN", "CRITICAL"] } } }),
    prisma.submissionSignal.count({ where: { resolvedAt: null, severity: "CRITICAL" } }),
    prisma.submissionSignal.count({ where: { resolvedAt: null, type: "TOKEN_BROKEN" } }),
    loadCampaignsAtRisk(now),
    loadTopClippers(),
    loadRecentRiskSignals(),
  ]);

  const metrics = calculateAgencyOsMetrics({
    now,
    campaigns,
    submissions,
    payouts,
    verifiedConnectionCreatorIds: [
      ...igConnections,
      ...ttConnections,
      ...ytConnections,
      ...fbConnections,
    ].map((connection) => connection.creatorProfileId),
    activeApplicationCreatorIds: activeApplications.map((application) => application.creatorProfileId),
    openRiskSignals,
    criticalRiskSignals,
    tokenBrokenSignals,
  });

  return {
    metrics,
    operatingAreas: buildOperatingAreas(),
    deliveryRisks,
    topClippers,
    recentRiskSignals,
  };
}
