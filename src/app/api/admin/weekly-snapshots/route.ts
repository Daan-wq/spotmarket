import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { getAgencyOsDashboardSnapshot } from "@/lib/admin/agency-os";
import { weeklySnapshotSchema } from "@/lib/admin/final-remediation-validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAuth("admin");
    const snapshots = await prisma.weeklyBusinessSnapshot.findMany({
      orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
      take: 52,
    });
    return NextResponse.json(serialize(snapshots));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/weekly-snapshots]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const parsed = weeklySnapshotSchema.parse(await req.json());
    const weekStart = parsed.weekStart as Date;
    const weekEnd = parsed.weekEnd as Date;
    const { metrics } = await getAgencyOsDashboardSnapshot(weekEnd);

    const snapshot = await prisma.weeklyBusinessSnapshot.upsert({
      where: { weekStart_weekEnd: { weekStart, weekEnd } },
      update: {
        status: parsed.status ?? "SAVED",
        notes: parsed.notes ?? null,
        revenueBooked: metrics.totalRevenueThisMonth,
        expectedRevenue: metrics.expectedRevenueNextMonth,
        creatorCost: metrics.creatorEarnings,
        payoutOwed: metrics.payoutsOwed,
        estimatedProfit: metrics.estimatedGrossProfit,
        activeBrands: metrics.activeBrands,
        activeClippers: metrics.activeClippers,
        clipsDelivered: metrics.clipsDeliveredThisWeek,
        clipsApproved: metrics.clipsApprovedThisWeek,
        clipsRejectedOrRevised: metrics.clipsRejectedOrRevisedThisWeek,
        openRisks: metrics.openRiskSignals,
      },
      create: {
        weekStart,
        weekEnd,
        status: parsed.status ?? "SAVED",
        notes: parsed.notes ?? null,
        createdBy: userId,
        revenueBooked: metrics.totalRevenueThisMonth,
        expectedRevenue: metrics.expectedRevenueNextMonth,
        creatorCost: metrics.creatorEarnings,
        payoutOwed: metrics.payoutsOwed,
        estimatedProfit: metrics.estimatedGrossProfit,
        activeBrands: metrics.activeBrands,
        activeClippers: metrics.activeClippers,
        clipsDelivered: metrics.clipsDeliveredThisWeek,
        clipsApproved: metrics.clipsApprovedThisWeek,
        clipsRejectedOrRevised: metrics.clipsRejectedOrRevisedThisWeek,
        openRisks: metrics.openRiskSignals,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "weeklySnapshot.save",
        entityType: "WeeklyBusinessSnapshot",
        entityId: snapshot.id,
        metadata: { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() },
      },
    });

    return NextResponse.json(serialize(snapshot), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/weekly-snapshots]");
  }
}
