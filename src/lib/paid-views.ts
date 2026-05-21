export type ViewLimitValue =
  | number
  | bigint
  | string
  | { toString(): string }
  | null
  | undefined;

export interface PaidViewInput {
  rawViews: ViewLimitValue;
  baselineViews?: ViewLimitValue;
  minimumPaidViews?: ViewLimitValue;
  maximumPaidViews?: ViewLimitValue;
}

export interface PaidViewResult {
  eligibleViews: number;
  payableViews: number;
}

export function calculatePaidViews({
  rawViews,
  baselineViews = 0,
  minimumPaidViews = 0,
  maximumPaidViews = null,
}: PaidViewInput): PaidViewResult {
  const raw = toWholeNumber(rawViews);
  const baseline = toWholeNumber(baselineViews);
  const minimum = toWholeNumber(minimumPaidViews);
  const maximum =
    maximumPaidViews === null || maximumPaidViews === undefined
      ? null
      : toWholeNumber(maximumPaidViews);

  const eligibleViews = Math.max(0, raw - baseline);
  const payableViews =
    eligibleViews >= minimum
      ? Math.min(eligibleViews, maximum ?? eligibleViews)
      : 0;

  return { eligibleViews, payableViews };
}

function toWholeNumber(value: ViewLimitValue): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}
