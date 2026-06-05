import { Prisma, type MetricSource } from "@prisma/client";

export const VALID_METRIC_SNAPSHOT_WHERE = {
  source: { not: "OAUTH_FAILED" },
} satisfies Prisma.MetricSnapshotWhereInput;

export function isValidMetricSnapshot(
  snapshot: { source: MetricSource | string },
): boolean {
  return snapshot.source !== "OAUTH_FAILED";
}
