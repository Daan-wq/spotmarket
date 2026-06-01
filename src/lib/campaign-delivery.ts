const THOUSAND = 1_000;

export type DeliveryNumeric =
  | number
  | bigint
  | string
  | { toNumber?: () => number; toString?: () => string }
  | null
  | undefined;

export interface CampaignDeliveryCampaignInput {
  totalBudget: DeliveryNumeric;
  creatorCpv: DeliveryNumeric;
  goalViews?: DeliveryNumeric;
}

export interface CampaignDeliverySnapshotInput {
  capturedAt: Date | string;
  viewCount: DeliveryNumeric;
}

export interface CampaignDeliverySubmissionInput {
  status?: string | null;
  eligibleViews?: DeliveryNumeric;
  viewCount?: DeliveryNumeric;
  claimedViews?: DeliveryNumeric;
  metricSnapshots?: CampaignDeliverySnapshotInput[];
}

export interface CampaignDeliveryMetrics {
  targetViews: number | null;
  targetViewsSource: "budget_cpm" | "legacy_goal" | "none";
  cpmPerThousand: number | null;
  currentViews: number;
  paidEligibleViews: number;
  overdeliveryViews: number;
  overdeliveryPercent: number | null;
  deliveryProgress: number | null;
}

export function calculateTargetViews(input: CampaignDeliveryCampaignInput): Pick<
  CampaignDeliveryMetrics,
  "targetViews" | "targetViewsSource" | "cpmPerThousand"
> {
  const totalBudget = toNumber(input.totalBudget);
  const creatorCpv = toNumber(input.creatorCpv);
  const cpmPerThousand = creatorCpv > 0 ? creatorCpv * THOUSAND : null;

  if (totalBudget > 0 && creatorCpv > 0) {
    return {
      targetViews: Math.floor(totalBudget / creatorCpv),
      targetViewsSource: "budget_cpm",
      cpmPerThousand,
    };
  }

  const legacyGoalViews = toWholeNumber(input.goalViews);
  if (legacyGoalViews > 0) {
    return {
      targetViews: legacyGoalViews,
      targetViewsSource: "legacy_goal",
      cpmPerThousand,
    };
  }

  return {
    targetViews: null,
    targetViewsSource: "none",
    cpmPerThousand,
  };
}

export function calculateDerivedGoalViews(input: CampaignDeliveryCampaignInput): number | null {
  return calculateTargetViews(input).targetViews;
}

export function calculateCampaignDelivery({
  campaign,
  submissions,
}: {
  campaign: CampaignDeliveryCampaignInput;
  submissions: CampaignDeliverySubmissionInput[];
}): CampaignDeliveryMetrics {
  const target = calculateTargetViews(campaign);
  const approved = submissions.filter((submission) => submission.status === "APPROVED");
  const currentViews = approved.reduce((sum, submission) => sum + submissionLiveViews(submission), 0);
  const paidEligibleViews = approved.reduce((sum, submission) => sum + toWholeNumber(submission.eligibleViews), 0);
  const overdeliveryViews = target.targetViews ? Math.max(0, currentViews - target.targetViews) : 0;

  return {
    ...target,
    currentViews,
    paidEligibleViews,
    overdeliveryViews,
    overdeliveryPercent: target.targetViews ? overdeliveryViews / target.targetViews : null,
    deliveryProgress: target.targetViews ? currentViews / target.targetViews : null,
  };
}

export function submissionLiveViews(submission: CampaignDeliverySubmissionInput): number {
  const latest = latestSnapshot(submission.metricSnapshots ?? []);
  return toWholeNumber(
    latest?.viewCount ??
      submission.viewCount ??
      submission.claimedViews ??
      submission.eligibleViews ??
      0,
  );
}

function latestSnapshot(snapshots: CampaignDeliverySnapshotInput[]) {
  if (snapshots.length === 0) return null;
  return [...snapshots].sort((a, b) => toDate(b.capturedAt).getTime() - toDate(a.capturedAt).getTime())[0];
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function toWholeNumber(value: DeliveryNumeric): number {
  const parsed = toNumber(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function toNumber(value: DeliveryNumeric): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value) || 0;
}
