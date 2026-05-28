/**
 * GET /api/clipper/live-earnings
 *
 * Returns live (estimated) and settled earnings for the current creator.
 *
 * - `settled` — sum of `earnedAmount` on submissions with `settledAt != null`.
 * - `estimated` - sum of stored, budget-capped `earnedAmount` on unsettled
 *   APPROVED submissions. Views still refresh separately for reporting.
 *
 * Owner: Subsystem C. Read-only across schema. Polled every 60s by the dashboard ticker.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePaidViews } from "@/lib/paid-views";

export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string;
  try {
    ({ userId } = await requireAuth("creator"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Settled earnings — already finalised, on the wallet path.
  const settledAgg = await prisma.campaignSubmission.aggregate({
    where: { creatorId: user.id, settledAt: { not: null } },
    _sum: { earnedAmount: true },
    _count: { _all: true },
  });

  // Unsettled approved submissions use stored earnings; latest views are for reporting.
  const unsettled = await prisma.campaignSubmission.findMany({
    where: {
      creatorId: user.id,
      status: "APPROVED",
      settledAt: null,
    },
    select: {
      id: true,
      earnedAmount: true,
      viewCount: true,
      claimedViews: true,
      eligibleViews: true,
      baselineViews: true,
      campaign: {
        select: {
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
      metricSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { viewCount: true, capturedAt: true },
      },
    },
  });

  let estimatedTotal = 0;
  let latestSnapshotAt: Date | null = null;
  const submissionsOut = unsettled.map((s) => {
    const latestSnap = s.metricSnapshots[0];
    const snapshotViews = latestSnap ? Number(latestSnap.viewCount) : null;
    const fallbackViews = s.viewCount ?? s.claimedViews ?? 0;
    const rawViews = snapshotViews ?? fallbackViews;
    const paidViews = calculatePaidViews({
      rawViews,
      baselineViews: s.baselineViews,
      minimumPaidViews: s.campaign.minimumPaidViews,
      maximumPaidViews: s.campaign.maximumPaidViews,
      creatorCpv: s.campaign.creatorCpv,
    });
    const eligible = paidViews.payableViews;
    const cpv = Number(s.campaign.creatorCpv);
    const estimated = Number(s.earnedAmount ?? 0);
    estimatedTotal += estimated;
    if (latestSnap && (!latestSnapshotAt || latestSnap.capturedAt > latestSnapshotAt)) {
      latestSnapshotAt = latestSnap.capturedAt;
    }
    return {
      submissionId: s.id,
      eligibleViews: eligible,
      cpv,
      estimated,
      hasSnapshot: snapshotViews !== null,
    };
  });

  return NextResponse.json({
    settled: Number(settledAgg._sum.earnedAmount ?? 0),
    settledCount: settledAgg._count._all,
    estimated: estimatedTotal,
    estimatedCount: submissionsOut.length,
    latestSnapshotAt: latestSnapshotAt
      ? (latestSnapshotAt as Date).toISOString()
      : null,
    submissions: submissionsOut,
    asOf: new Date().toISOString(),
  });
}
