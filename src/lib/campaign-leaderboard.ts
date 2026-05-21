import { calculatePaidViews } from "@/lib/paid-views";
import { resolveCreatorLeaderboardName } from "@/lib/creator-leaderboard-name";

type NumericLike = number | string | { toString(): string } | null | undefined;

interface CampaignLeaderboardMetricSnapshot {
  viewCount: NumericLike;
  capturedAt?: Date | string | null;
}

export interface CampaignLeaderboardSubmission {
  creatorId: string;
  postUrl?: string | null;
  viewCount?: number | null;
  claimedViews?: number | null;
  eligibleViews?: number | null;
  baselineViews?: NumericLike;
  earnedAmount?: NumericLike;
  metricSnapshots?: ReadonlyArray<CampaignLeaderboardMetricSnapshot>;
  campaign: {
    creatorCpv: NumericLike;
    minimumPaidViews?: NumericLike;
    maximumPaidViews?: NumericLike;
  };
  creator: {
    email: string;
    discordUsername?: string | null;
    creatorProfile?: {
      id?: string | null;
      username?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
}

export interface CampaignLeaderboardRow {
  creatorId: string;
  creatorProfileId: string | null;
  displayName: string;
  avatarUrl: string | null;
  submissionCount: number;
  totalViews: number;
  totalEarned: number;
  bestPostUrl: string | null;
  bestPostViews: number;
}

function toNumber(value: NumericLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function campaignLeaderboardTotalViews(
  submission: CampaignLeaderboardSubmission,
): number {
  const latestSnapshotViews = submission.metricSnapshots?.[0]?.viewCount;
  return toNumber(latestSnapshotViews ?? submission.viewCount ?? submission.claimedViews ?? 0);
}

export function campaignLeaderboardPayableViews(
  submission: CampaignLeaderboardSubmission,
): number {
  const calculated = calculatePaidViews({
    rawViews: campaignLeaderboardTotalViews(submission),
    baselineViews: submission.baselineViews,
    minimumPaidViews: submission.campaign.minimumPaidViews,
    maximumPaidViews: submission.campaign.maximumPaidViews,
  }).payableViews;

  if (submission.eligibleViews == null) return calculated;

  const storedEligibleViews = toNumber(submission.eligibleViews);
  return storedEligibleViews > 0 ? storedEligibleViews : calculated;
}

export function campaignLeaderboardEarnings(
  submission: CampaignLeaderboardSubmission,
): number {
  const stored = toNumber(submission.earnedAmount);
  if (stored > 0) return roundMoney(stored);

  return roundMoney(
    campaignLeaderboardPayableViews(submission) * toNumber(submission.campaign.creatorCpv),
  );
}

export function buildCampaignLeaderboardRows(
  submissions: ReadonlyArray<CampaignLeaderboardSubmission>,
): CampaignLeaderboardRow[] {
  const byCreator = new Map<string, CampaignLeaderboardRow>();

  for (const submission of submissions) {
    const profile = submission.creator.creatorProfile;
    const views = campaignLeaderboardTotalViews(submission);
    const earned = campaignLeaderboardEarnings(submission);
    const current =
      byCreator.get(submission.creatorId) ??
      {
        creatorId: submission.creatorId,
        creatorProfileId: profile?.id ?? null,
        displayName:
          resolveCreatorLeaderboardName(submission.creator) ??
          submission.creator.email,
        avatarUrl: profile?.avatarUrl ?? null,
        submissionCount: 0,
        totalViews: 0,
        totalEarned: 0,
        bestPostUrl: null,
        bestPostViews: 0,
      };

    current.submissionCount += 1;
    current.totalViews += views;
    current.totalEarned = roundMoney(current.totalEarned + earned);
    if (views > current.bestPostViews) {
      current.bestPostViews = views;
      current.bestPostUrl = submission.postUrl ?? null;
    }

    byCreator.set(submission.creatorId, current);
  }

  return Array.from(byCreator.values());
}
