import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateReferralSplit } from "@/lib/referral";
import { calculatePaidViews } from "@/lib/paid-views";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionNote: z.string().trim().max(5000).optional(),
  baselineViews: z.number().int().min(0).optional(),
  viewCount: z.number().int().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "REJECTED" && !data.rejectionNote) {
    ctx.addIssue({
      code: "custom",
      path: ["rejectionNote"],
      message: "Rejection note is required",
    });
  }
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;

    const body = await req.json();
    const { status, rejectionNote, baselineViews, viewCount } = reviewSchema.parse(body);

    const submission = await prisma.campaignSubmission.findUnique({
      where: { id },
      include: { campaign: true, application: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    let earnedAmount = Number(submission.earnedAmount);
    let eligibleViews: number | null = null;
    let approvedBaselineViews: number | undefined;
    let approvedViewCount: number | undefined;

    if (status === "APPROVED") {
      approvedBaselineViews = baselineViews ?? submission.baselineViews ?? 0;
      approvedViewCount = viewCount ?? submission.viewCount ?? submission.claimedViews ?? 0;
      eligibleViews = calculatePaidViews({
        rawViews: approvedViewCount,
        baselineViews: approvedBaselineViews,
        minimumPaidViews: submission.campaign.minimumPaidViews,
        maximumPaidViews: submission.campaign.maximumPaidViews,
      }).payableViews;
      earnedAmount = eligibleViews * Number(submission.campaign.creatorCpv);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const isFirstApproval = status === "APPROVED" && submission.status !== "APPROVED";

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
          totalPaidSoFar
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
          baselineViews: approvedBaselineViews ?? baselineViews ?? undefined,
          viewCount: approvedViewCount ?? viewCount ?? undefined,
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

      await tx.notification.create({
        data: {
          userId: submission.creatorId,
          type: status === "APPROVED" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
          data: {
            campaignName: submission.campaign.name,
            submissionId: submission.id,
            earnedAmount: status === "APPROVED" ? earnedAmount : null,
            rejectionNote,
          },
        },
      });

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
