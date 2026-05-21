export type PaidViewNumeric =
  | number
  | bigint
  | string
  | { toString(): string }
  | null
  | undefined;

export interface PaidViewInput {
  rawViews: PaidViewNumeric;
  baselineViews?: PaidViewNumeric;
  minimumPaidViews?: PaidViewNumeric;
  maximumPaidViews?: PaidViewNumeric;
  creatorCpv?: PaidViewNumeric;
}

export interface PaidViewResult {
  actualViews: number;
  trackedViews: number;
  payableViews: number;
  eligibleViews: number;
  earnedAmount: number;
}

export function calculatePaidViews({
  rawViews,
  baselineViews = 0,
  minimumPaidViews = 0,
  maximumPaidViews = null,
  creatorCpv = 0,
}: PaidViewInput): PaidViewResult {
  const actualViews = toWholeNumber(rawViews);
  const baseline = toWholeNumber(baselineViews);
  const minimum = toWholeNumber(minimumPaidViews);
  const maximum =
    maximumPaidViews === null || maximumPaidViews === undefined
      ? null
      : toWholeNumber(maximumPaidViews);

  const trackedViews = Math.max(0, actualViews - baseline);
  const payableViews =
    trackedViews >= minimum
      ? Math.min(trackedViews, maximum ?? trackedViews)
      : 0;

  return {
    actualViews,
    trackedViews,
    payableViews,
    eligibleViews: payableViews,
    earnedAmount: roundMoney(payableViews * toMoneyNumber(creatorCpv)),
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toWholeNumber(value: PaidViewNumeric): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}

function toMoneyNumber(value: PaidViewNumeric): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
