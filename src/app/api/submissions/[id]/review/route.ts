import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePaidViews } from "@/lib/paid-views";
import { calculateReferralSplit } from "@/lib/referral";

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

      const creator = await tx.user.findUnique({
        where: { id: submission.creatorId },
        select: { referredBy: true, createdAt: true },
      });

      let creatorAmount = earnedAmount;

      if (isFirstApproval && creator?.referredBy) {
        const [existingPayout, alreadyPaid] = await Promise.all([
          tx.referralPayout.findFirst({
            where: {
              referrerId: creator.referredBy,
              referredUserId: submission.creatorId,
              submissionId: submission.id,
            },
            select: { id: true },
          }),
          tx.referralPayout.aggregate({
            where: {
              referrerId: creator.referredBy,
              referredUserId: submission.creatorId,
            },
            _sum: { amount: true },
          }),
        ]);
        const totalPaidSoFar = Number(alreadyPaid._sum.amount ?? 0);

        const split = calculateReferralSplit(
          earnedAmount,
          creator.referredBy,
          creator.createdAt,
          totalPaidSoFar,
        );
        creatorAmount = split.creatorAmount;

        if (!existingPayout && split.referralFee > 0 && split.referrerId) {
          await tx.referralPayout.create({
            data: {
              referrerId: split.referrerId,
              referredUserId: submission.creatorId,
              campaignApplicationId: submission.applicationId,
              submissionId: submission.id,
              amount: split.referralFee,
              status: "pending",
            },
          });

          await tx.user.update({
            where: { id: split.referrerId },
            data: { referralEarnings: { increment: split.referralFee } },
          });

          await tx.notification.create({
            data: {
              userId: split.referrerId,
              type: "REFERRAL_EARNED",
              data: {
                campaignName: submission.campaign.name,
                amount: split.referralFee,
                referredUserId: submission.creatorId,
              },
            },
          });
        }
      }

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

      if (isFirstApproval && submission.application) {
        await tx.campaignApplication.update({
          where: { id: submission.application.id },
          data: {
            earnedAmount: { increment: Math.round(creatorAmount) },
          },
        });
      }

      if (isApprovedRejection && submission.application && previousEarnedAmount > 0) {
        await tx.campaignApplication.update({
          where: { id: submission.application.id },
          data: {
            earnedAmount: { decrement: Math.round(previousEarnedAmount) },
          },
        });
      }

      if (isApprovedRejection) {
        const referralPayout = await tx.referralPayout.findFirst({
          where: {
            submissionId: submission.id,
            status: "pending",
          },
          select: {
            id: true,
            amount: true,
            referrerId: true,
          },
        });

        if (referralPayout) {
          await tx.referralPayout.deleteMany({
            where: {
              id: referralPayout.id,
              status: "pending",
            },
          });
          await tx.user.update({
            where: { id: referralPayout.referrerId },
            data: {
              referralEarnings: { decrement: Number(referralPayout.amount) },
            },
          });
        }
      }

      const notificationData =
        status === "APPROVED"
          ? {
              campaignName: submission.campaign.name,
              submissionId: submission.id,
              earnedAmount,
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

      return sub;
    });

    return NextResponse.json({ submission: updated });
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
