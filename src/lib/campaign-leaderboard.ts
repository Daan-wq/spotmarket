import { calculatePaidViews } from "@/lib/paid-views";
import { resolveCreatorLeaderboardName } from "@/lib/creator-leaderboard-name";
import { isExcludedFromLeaderboards } from "@/lib/leaderboard-exclusions";

type NumericLike = number | string | { toString(): string } | null | undefined;

interface CampaignLeaderboardMetricSnapshot {
  viewCount: NumericLike;
  capturedAt?: Date | string | null;
  source?: string | null;
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

export type CampaignLeaderboardSort = "views" | "earnings" | "score";

export interface ScoredCampaignLeaderboardRow extends CampaignLeaderboardRow {
  score: number | null;
}

export interface RankedCampaignLeaderboardRow extends ScoredCampaignLeaderboardRow {
  rank: number;
}

export interface CampaignLeaderboardSelection {
  leaderboard: RankedCampaignLeaderboardRow[];
  currentUserEntry: RankedCampaignLeaderboardRow | null;
  totalClippers: number;
}

export interface CampaignLeaderboardDisplayRow {
  row: RankedCampaignLeaderboardRow;
  isCurrentUser: boolean;
  isAdditional: boolean;
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
  const latestSnapshotViews = submission.metricSnapshots?.find(
    (snapshot) => snapshot.source !== "OAUTH_FAILED",
  )?.viewCount;
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
  return roundMoney(toNumber(submission.earnedAmount));
}

export function buildCampaignLeaderboardRows(
  submissions: ReadonlyArray<CampaignLeaderboardSubmission>,
): CampaignLeaderboardRow[] {
  const byCreator = new Map<string, CampaignLeaderboardRow>();

  for (const submission of submissions) {
    if (isExcludedFromLeaderboards(submission.creator)) continue;

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

export function selectCampaignLeaderboardRows(
  rows: ReadonlyArray<ScoredCampaignLeaderboardRow>,
  {
    sort,
    currentUserId,
    limit = 5,
  }: {
    sort: CampaignLeaderboardSort;
    currentUserId?: string | null;
    limit?: number;
  },
): CampaignLeaderboardSelection {
  const ranked = [...rows]
    .sort((a, b) => compareLeaderboardRows(a, b, sort))
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
  const visibleLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(5, Math.trunc(limit)))
    : 5;

  return {
    leaderboard: ranked.slice(0, visibleLimit),
    currentUserEntry: currentUserId
      ? ranked.find((row) => row.creatorId === currentUserId) ?? null
      : null,
    totalClippers: ranked.length,
  };
}

export function buildCampaignLeaderboardDisplayRows(
  leaderboard: ReadonlyArray<RankedCampaignLeaderboardRow>,
  currentUserEntry: RankedCampaignLeaderboardRow | null,
): CampaignLeaderboardDisplayRow[] {
  const currentUserId = currentUserEntry?.creatorId ?? null;
  const displayRows = leaderboard.map((row) => ({
    row,
    isCurrentUser: row.creatorId === currentUserId,
    isAdditional: false,
  }));

  if (
    currentUserEntry &&
    !leaderboard.some((row) => row.creatorId === currentUserEntry.creatorId)
  ) {
    displayRows.push({
      row: currentUserEntry,
      isCurrentUser: true,
      isAdditional: true,
    });
  }

  return displayRows;
}

function compareLeaderboardRows(
  a: ScoredCampaignLeaderboardRow,
  b: ScoredCampaignLeaderboardRow,
  sort: CampaignLeaderboardSort,
): number {
  if (sort === "earnings") {
    return (
      b.totalEarned - a.totalEarned ||
      b.totalViews - a.totalViews ||
      a.creatorId.localeCompare(b.creatorId)
    );
  }

  if (sort === "score") {
    return (
      (b.score ?? -1) - (a.score ?? -1) ||
      b.totalViews - a.totalViews ||
      b.totalEarned - a.totalEarned ||
      a.creatorId.localeCompare(b.creatorId)
    );
  }

  return (
    b.totalViews - a.totalViews ||
    b.totalEarned - a.totalEarned ||
    a.creatorId.localeCompare(b.creatorId)
  );
}
