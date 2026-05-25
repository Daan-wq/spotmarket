import type { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseClipUrl } from "@/lib/parse-clip-url";

type NumericLike = number | string | { toString(): string } | null;

interface BackfillRow {
  id: string;
  applicationId: string;
  postUrl: string;
  status: SubmissionStatus;
  earnedAmount: NumericLike;
  settledAt: Date | null;
  createdAt: Date;
  payoutRunItems: Array<{ id: string }>;
}

interface PlannedIdentityRow extends BackfillRow {
  normalizedPlatform: string;
  platformVideoId: string;
  key: string;
}

export interface SubmissionVideoIdentityBackfillResult {
  dryRun: boolean;
  scanned: number;
  backfilled: number;
  rejectedDuplicates: number;
  lockedDuplicates: number;
  unparseable: Array<{ id: string; postUrl: string }>;
  duplicateGroups: Array<{
    key: string;
    canonicalId: string;
    duplicateIds: string[];
    lockedDuplicateIds: string[];
  }>;
}

export async function backfillSubmissionVideoIdentities({
  dryRun = true,
  limit = 1000,
}: {
  dryRun?: boolean;
  limit?: number;
} = {}): Promise<SubmissionVideoIdentityBackfillResult> {
  const rows = await prisma.campaignSubmission.findMany({
    where: {
      OR: [{ normalizedPlatform: null }, { platformVideoId: null }],
    },
    select: {
      id: true,
      applicationId: true,
      postUrl: true,
      status: true,
      earnedAmount: true,
      settledAt: true,
      createdAt: true,
      payoutRunItems: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const plan = planSubmissionVideoIdentityBackfill(rows);

  if (!dryRun) {
    await prisma.$transaction(
      async (tx) => {
        for (const row of plan.canonicalRows) {
          await tx.campaignSubmission.update({
            where: { id: row.id },
            data: {
              normalizedPlatform: row.normalizedPlatform,
              platformVideoId: row.platformVideoId,
            },
          });
        }

        for (const row of plan.rejectableDuplicates) {
          const previousEarnedAmount = toNumber(row.earnedAmount);
          await tx.campaignSubmission.update({
            where: { id: row.id },
            data: {
              status: "REJECTED",
              earnedAmount: 0,
              rejectionNote: `Duplicate of ${plan.canonicalByKey.get(row.key)?.id ?? "another submission"}`,
            },
          });

          if (row.status === "APPROVED" && previousEarnedAmount > 0) {
            await tx.campaignApplication.update({
              where: { id: row.applicationId },
              data: { earnedAmount: { decrement: Math.round(previousEarnedAmount) } },
            });
          }
        }
      },
      { maxWait: 10_000, timeout: 60_000 },
    );
  }

  return {
    dryRun,
    scanned: rows.length,
    backfilled: plan.canonicalRows.length,
    rejectedDuplicates: plan.rejectableDuplicates.length,
    lockedDuplicates: plan.lockedDuplicates.length,
    unparseable: plan.unparseable.map((row) => ({ id: row.id, postUrl: row.postUrl })),
    duplicateGroups: plan.duplicateGroups.map((group) => ({
      key: group.key,
      canonicalId: group.canonical.id,
      duplicateIds: group.duplicates.map((row) => row.id),
      lockedDuplicateIds: group.lockedDuplicates.map((row) => row.id),
    })),
  };
}

export function planSubmissionVideoIdentityBackfill(rows: BackfillRow[]) {
  const unparseable: BackfillRow[] = [];
  const byKey = new Map<string, PlannedIdentityRow[]>();

  for (const row of rows) {
    const parsed = parseClipUrl(row.postUrl);
    if (!parsed.normalizedPlatform || !parsed.platformVideoId) {
      unparseable.push(row);
      continue;
    }

    const key = `${parsed.normalizedPlatform}:${parsed.platformVideoId}`;
    const planned: PlannedIdentityRow = {
      ...row,
      normalizedPlatform: parsed.normalizedPlatform,
      platformVideoId: parsed.platformVideoId,
      key,
    };
    byKey.set(key, [...(byKey.get(key) ?? []), planned]);
  }

  const canonicalRows: PlannedIdentityRow[] = [];
  const rejectableDuplicates: PlannedIdentityRow[] = [];
  const lockedDuplicates: PlannedIdentityRow[] = [];
  const duplicateGroups: Array<{
    key: string;
    canonical: PlannedIdentityRow;
    duplicates: PlannedIdentityRow[];
    lockedDuplicates: PlannedIdentityRow[];
  }> = [];
  const canonicalByKey = new Map<string, PlannedIdentityRow>();

  for (const [key, groupRows] of byKey) {
    const sorted = [...groupRows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const canonical = sorted[0];
    if (!canonical) continue;

    canonicalRows.push(canonical);
    canonicalByKey.set(key, canonical);

    const duplicates = sorted.slice(1);
    const locked = duplicates.filter(isFinanciallyLocked);
    const rejectable = duplicates.filter((row) => !isFinanciallyLocked(row));

    lockedDuplicates.push(...locked);
    rejectableDuplicates.push(...rejectable);

    if (duplicates.length > 0) {
      duplicateGroups.push({
        key,
        canonical,
        duplicates,
        lockedDuplicates: locked,
      });
    }
  }

  return {
    canonicalRows,
    canonicalByKey,
    rejectableDuplicates,
    lockedDuplicates,
    duplicateGroups,
    unparseable,
  };
}

function isFinanciallyLocked(row: BackfillRow) {
  return Boolean(row.settledAt || row.payoutRunItems.length > 0);
}

function toNumber(value: NumericLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}
