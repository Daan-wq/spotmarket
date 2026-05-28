import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, isoDate, serialize } from "@/lib/admin/agency-api";
import { reconcileCampaignBudgetCap } from "@/lib/campaign-budget-cap";
import { isSubmissionPayoutEligible } from "@/lib/financial-eligibility";
import { reconcileReferralPayoutForSubmission } from "@/lib/referral-reconciliation";

const payoutRunSchema = z.object({
  name: z.string().max(180).optional(),
  periodStart: isoDate.refine((date) => date instanceof Date, "periodStart is required"),
  periodEnd: isoDate.refine((date) => date instanceof Date, "periodEnd is required"),
  currency: z.string().length(3).optional(),
});

export async function GET(req: Request) {
  try {
    await requireAuth("admin");
    const url = new URL(req.url);
    const runs = await prisma.payoutRun.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } } } },
      take: 200,
    });

    if (url.searchParams.get("format") === "csv") {
      const rows = [
        ["run", "status", "period_start", "period_end", "creator", "email", "clips", "bonus", "deduction", "total"].join(","),
        ...runs.flatMap((run) =>
          run.items.map((item) =>
            [
              csv(run.name),
              run.status,
              run.periodStart.toISOString(),
              run.periodEnd.toISOString(),
              csv(item.creatorProfile?.displayName ?? ""),
              csv(item.creatorProfile?.user?.email ?? ""),
              item.approvedClips,
              item.bonus,
              item.deduction,
              item.total,
            ].join(","),
          ),
        ),
      ];
      return new NextResponse(rows.join("\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=clipprofit-payout-runs.csv",
        },
      });
    }

    return NextResponse.json(serialize(runs));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/payout-runs]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const data = payoutRunSchema.parse(await req.json());
    const periodStart = data.periodStart as Date;
    const periodEnd = data.periodEnd as Date;
    const currency = data.currency ?? "EUR";

    const run = await prisma.$transaction(async (tx) => {
      const campaignRows = await tx.campaignSubmission.findMany({
        where: {
          status: "APPROVED",
          reviewedAt: { gte: periodStart, lte: periodEnd },
          settledAt: null,
          payoutRunItems: { none: {} },
        },
        select: { campaignId: true },
        distinct: ["campaignId"],
      });
      for (const row of campaignRows) {
        await reconcileCampaignBudgetCap(tx, row.campaignId);
      }

      const approvedSubmissions = await tx.campaignSubmission.findMany({
        where: {
          status: "APPROVED",
          reviewedAt: { gte: periodStart, lte: periodEnd },
          settledAt: null,
          payoutRunItems: { none: {} },
          earnedAmount: { gt: 0 },
          submissionSignals: {
            none: {
              resolvedAt: null,
              severity: { in: ["WARN", "CRITICAL"] },
            },
          },
        },
        include: {
          productionAssignment: true,
          payoutRunItems: {
            select: {
              id: true,
              payout: { select: { status: true } },
            },
          },
          submissionSignals: {
            where: {
              resolvedAt: null,
              severity: { in: ["WARN", "CRITICAL"] },
            },
            select: { severity: true, resolvedAt: true },
          },
          creator: {
            select: {
              creatorProfile: {
                select: {
                  id: true,
                  operationalProfile: { select: { ratePerClip: true } },
                },
              },
            },
          },
        },
        take: 500,
      });

      const eligibleSubmissions = approvedSubmissions.filter((submission) =>
        Boolean(submission.creator.creatorProfile?.id) &&
        isSubmissionPayoutEligible(submission),
      );
      for (const submission of eligibleSubmissions) {
        await reconcileReferralPayoutForSubmission(tx, submission.id);
      }

      const items = eligibleSubmissions.map((submission) => {
        const creatorProfile = submission.creator.creatorProfile!;
        const gross = Number(submission.earnedAmount);
        const rate = Number(creatorProfile.operationalProfile?.ratePerClip ?? 0);
        return {
          creatorProfileId: creatorProfile.id,
          submissionId: submission.id,
          productionAssignmentId: submission.productionAssignment?.id,
          approvedClips: 1,
          ratePerClip: rate,
          bonus: 0,
          deduction: 0,
          total: gross,
        };
      });

      const totalGross = items.reduce((sum, item) => sum + item.total, 0);
      const totalNet = totalGross;

      const createdRun = await tx.payoutRun.create({
        data: {
          name: data.name ?? `Payout run ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
          periodStart,
          periodEnd,
          currency,
          totalGross,
          totalNet,
          createdBy: userId,
          items: { create: items },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "payoutRun.create",
          entityType: "PayoutRun",
          entityId: createdRun.id,
          metadata: { itemCount: createdRun.items.length, totalNet },
        },
      });

      return createdRun;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(serialize(run), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/payout-runs]");
  }
}

function csv(value: unknown) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}
