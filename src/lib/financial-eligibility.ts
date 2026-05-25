type NumericLike = number | string | { toString(): string } | null | undefined;

export const BLOCKING_PAYOUT_SIGNAL_SEVERITIES = ["WARN", "CRITICAL"] as const;

const BLOCKING_SEVERITY_SET = new Set<string>(BLOCKING_PAYOUT_SIGNAL_SEVERITIES);
const PAID_PAYOUT_STATUSES = new Set(["sent", "confirmed"]);
const OPEN_PAYOUT_STATUSES = new Set(["pending", "processing"]);

export interface FinancialSignal {
  severity: string;
  resolvedAt?: Date | string | null;
}

export interface FinancialPayoutRunItem {
  id?: string;
  payout?: { status?: string | null } | null;
}

export interface FinancialSubmission {
  status?: string | null;
  earnedAmount?: NumericLike;
  settledAt?: Date | string | null;
  payoutRunItems?: ReadonlyArray<FinancialPayoutRunItem>;
  submissionSignals?: ReadonlyArray<FinancialSignal>;
}

export type SubmissionFinancialState =
  | "available"
  | "pending_review"
  | "pending_payout"
  | "paid"
  | "ineligible";

export function hasBlockingFinancialSignal(submission: FinancialSubmission): boolean {
  return (submission.submissionSignals ?? []).some(
    (signal) =>
      !signal.resolvedAt && BLOCKING_SEVERITY_SET.has(signal.severity),
  );
}

export function submissionEarnedAmount(submission: FinancialSubmission): number {
  return roundMoney(toNumber(submission.earnedAmount));
}

export function getSubmissionFinancialState(
  submission: FinancialSubmission,
): SubmissionFinancialState {
  const amount = submissionEarnedAmount(submission);
  if ((submission.status ?? "APPROVED") !== "APPROVED" || amount <= 0) {
    return "ineligible";
  }
  if (submission.settledAt) return "paid";
  if (hasBlockingFinancialSignal(submission)) return "pending_review";

  const payoutRunItems = submission.payoutRunItems ?? [];
  if (payoutRunItems.length > 0) {
    return payoutRunItems.some((item) =>
      PAID_PAYOUT_STATUSES.has(normalizedStatus(item.payout?.status)),
    )
      ? "paid"
      : "pending_payout";
  }

  return "available";
}

export function isSubmissionPayoutEligible(submission: FinancialSubmission): boolean {
  return getSubmissionFinancialState(submission) === "available";
}

export function isOpenPayoutStatus(status: string): boolean {
  return OPEN_PAYOUT_STATUSES.has(normalizedStatus(status));
}

export function isPaidPayoutStatus(status: string): boolean {
  return PAID_PAYOUT_STATUSES.has(normalizedStatus(status));
}

export function normalizedStatus(status: string | null | undefined): string {
  return (status ?? "").toLowerCase();
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: NumericLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}
