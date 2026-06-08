import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VALID_METRIC_SNAPSHOT_WHERE } from "@/lib/metrics/valid-snapshots";
import { reconcileCampaignBudgetCap } from "@/lib/campaign-budget-cap";
import { calculatePaidViews } from "@/lib/paid-views";
import { reconcileReferralPayoutForSubmission } from "@/lib/referral-reconciliation";

const rejectionReasonSchema = z.enum([
  "BOT_TRAFFIC",
  "INVALID_POST",
  "RULE_VIOLATION",
  "DUPLICATE",
  "OTHER",
]);

const REJECTION_REASON_LABELS = {
  BOT_TRAFFIC: "Botted traffic",
  INVALID_POST: "Invalid post",
  RULE_VIOLATION: "Rule violation",
  DUPLICATE: "Duplicate",
  OTHER: "Other",
} satisfies Record<z.infer<typeof rejectionReasonSchema>, string>;

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: rejectionReasonSchema.optional(),
  rejectionNote: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.status !== "REJECTED") return;

  if (!data.rejectionReason) {
    ctx.addIssue({
      code: "custom",
      path: ["rejectionReason"],
      message: "Rejection reason is required",
    });
  }

});

const PAID_LOCKED_ERROR =
  "This approved submission is already paid or locked in a payout run. Use a financial adjustment workflow instead.";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;

    const body = await req.json();
    const { status, rejectionReason, rejectionNote: rawRejectionNote } = reviewSchema.parse(body);
    const rejectionNote =
      status === "REJECTED" && rejectionReason
        ? rawRejectionNote || REJECTION_REASON_LABELS[rejectionReason]
        : rawRejectionNote;

    const submission = await prisma.campaignSubmission.findUnique({
      where: { id },
      include: {
        campaign: true,
        application: true,
        payoutRunItems: { select: { id: true } },
        metricSnapshots: {
          where: VALID_METRIC_SNAPSHOT_WHERE,
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: { viewCount: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const adminAuditUserId =
      status === "REJECTED"
        ? (await prisma.user.findUnique({
            where: { supabaseId: userId },
            select: { id: true },
          }))?.id ?? null
        : null;
    if (status === "REJECTED" && !adminAuditUserId) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    if (
      submission.status === "APPROVED" &&
      (status === "REJECTED" || status === "APPROVED") &&
      (submission.settledAt || submission.payoutRunItems.length > 0)
    ) {
      return NextResponse.json({ error: PAID_LOCKED_ERROR }, { status: 409 });
    }

    let earnedAmount = Number(submission.earnedAmount);
    let eligibleViews: number | null = submission.eligibleViews;
    let trackedViewCount: number | null = null;

    if (status === "APPROVED") {
      trackedViewCount = getTrackedViewCount(submission);
      if (trackedViewCount !== null) {
        const paidViews = calculatePaidViews({
          rawViews: trackedViewCount,
          baselineViews: submission.baselineViews,
          minimumPaidViews: submission.campaign.minimumPaidViews,
          maximumPaidViews: submission.campaign.maximumPaidViews,
          creatorCpv: submission.campaign.creatorCpv,
        });
        eligibleViews = paidViews.payableViews;
        earnedAmount = paidViews.earnedAmount;
      }
    } else {
      earnedAmount = 0;
      eligibleViews = 0;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const isFirstApproval = status === "APPROVED" && submission.status !== "APPROVED";
      const isApprovedRejection =
        status === "REJECTED" && submission.status === "APPROVED";
      const previousEarnedAmount = Number(submission.earnedAmount);

      const sub = await tx.campaignSubmission.update({
        where: { id },
        data: {
          status,
          earnedAmount,
          viewCount: trackedViewCount ?? undefined,
          eligibleViews: eligibleViews ?? undefined,
          rejectionNote: status === "REJECTED" ? rejectionNote : null,
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
        include: { campaign: true, creator: true },
      });
      const budgetCap = await reconcileCampaignBudgetCap(tx, submission.campaignId);
      const finalEarnedAmount =
        budgetCap.allocations.find((allocation) => allocation.id === submission.id)
          ?.earnedAmount ?? Number(sub.earnedAmount);
      const referralSubmissionIds = new Set([
        submission.id,
        ...budgetCap.changedSubmissionIds,
      ]);
      for (const changedSubmissionId of referralSubmissionIds) {
        await reconcileReferralPayoutForSubmission(tx, changedSubmissionId);
      }

      if (status === "APPROVED") {
        await tx.campaignReferralAttribution.updateMany({
          where: {
            campaignId: submission.campaignId,
            referredUserId: submission.creatorId,
            firstSubmissionAt: null,
          },
          data: { firstSubmissionAt: submission.createdAt },
        });
      }

      if (status === "APPROVED" && finalEarnedAmount > 0) {
        await tx.campaignReferralAttribution.updateMany({
          where: {
            campaignId: submission.campaignId,
            referredUserId: submission.creatorId,
            activeAt: null,
          },
          data: {
            activeAt: new Date(),
            firstEarnedAmount: finalEarnedAmount,
          },
        });
      }

      if (isFirstApproval && submission.application) {
        await tx.campaignApplication.update({
          where: { id: submission.application.id },
          data: {
            earnedAmount: { increment: Math.round(finalEarnedAmount) },
          },
        });
      }

      if (isApprovedRejection && submission.application) {
        const legacyApplicationEarnedAmountUpdate =
          legacyApplicationReversalUpdate(
            submission.application.earnedAmount,
            previousEarnedAmount,
          );

        if (legacyApplicationEarnedAmountUpdate) {
          await tx.campaignApplication.update({
            where: { id: submission.application.id },
            data: {
              earnedAmount: legacyApplicationEarnedAmountUpdate,
            },
          });
        }
      }

      const notificationData =
        status === "APPROVED"
          ? {
              campaignName: submission.campaign.name,
              submissionId: submission.id,
              earnedAmount: finalEarnedAmount,
            }
          : {
              campaignName: submission.campaign.name,
              submissionId: submission.id,
              earnedAmount: null,
              rejectionReason,
              rejectionNote,
            };

      await tx.notification.create({
        data: {
          userId: submission.creatorId,
          type: status === "APPROVED" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
          data: notificationData,
        },
      });

      if (status === "REJECTED") {
        if (!adminAuditUserId) throw new Error("Admin user not found");
        await tx.auditLog.create({
          data: {
            userId: adminAuditUserId,
            action: "submission.reject",
            entityType: "CampaignSubmission",
            entityId: submission.id,
            metadata: {
              rejectionReason,
              rejectionNote,
              previousStatus: submission.status,
              previousEarnedAmount,
              wasApproved: isApprovedRejection,
            },
          },
        });
      }

      return { ...sub, earnedAmount: finalEarnedAmount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      success: true,
      submissionId: updated.id,
      status: updated.status,
    });
  } catch (err: unknown) {
    console.error("[submissions review]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

function getTrackedViewCount(submission: {
  viewCount: number | null;
  metricSnapshots: Array<{ viewCount: bigint | number | string | { toString(): string } }>;
}) {
  const latestSnapshotViews = submission.metricSnapshots[0]?.viewCount;
  const value = latestSnapshotViews ?? submission.viewCount;
  if (value === null || value === undefined) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.min(Math.trunc(parsed), 2_147_483_647);
}

function legacyApplicationReversalUpdate(
  currentEarnedAmount: number | string | { toString(): string } | null | undefined,
  previousSubmissionEarnedAmount: number,
) {
  const current = Math.round(toFiniteNumber(currentEarnedAmount));
  const reversal = Math.round(previousSubmissionEarnedAmount);

  if (current < 0) return { set: 0 };
  if (reversal <= 0 || current <= 0) return null;
  if (current <= reversal) return { set: 0 };

  return { decrement: reversal };
}

function toFiniteNumber(value: number | string | { toString(): string } | null | undefined) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
