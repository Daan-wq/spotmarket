import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { notifyVideoSubmissionReviewed } from "@/lib/submission-review";
import { calculateReferralSplit } from "@/lib/referral";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionNote: z.string().optional(),
  baselineViews: z.number().int().min(0).optional(),
  viewCount: z.number().int().min(0).optional(),
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

    // Calculate eligible views and earnings
    let earnedAmount = Number(submission.earnedAmount);
    let eligibleViews: number | null = null;
    if (status === "APPROVED") {
      if (baselineViews == null || viewCount == null) {
        return NextResponse.json(
          { error: "baselineViews and viewCount are required for approval" },
          { status: 400 }
        );
      }
      eligibleViews = Math.max(0, viewCount - baselineViews);
      const campaign = submission.campaign;
      earnedAmount = eligibleViews * Number(campaign.creatorCpv);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Fetch creator to check referral status
      const creator = await tx.user.findUnique({
        where: { id: submission.creatorId },
        select: { referredBy: true, createdAt: true },
      });

      // Creator keeps 100% — referral fee is paid on top by the platform
      let creatorAmount = earnedAmount;

      // Calculate referral bonus if creator was referred
      if (status === "APPROVED" && creator?.referredBy) {
        // Check how much has already been paid to referrer for this creator ($100 cap)
        const alreadyPaid = await tx.referralPayout.aggregate({
          where: {
            referrerId: creator.referredBy,
            referredUserId: submission.creatorId,
          },
          _sum: { amount: true },
        });
        const totalPaidSoFar = Number(alreadyPaid._sum.amount ?? 0);

        const split = calculateReferralSplit(
          earnedAmount,
          creator.referredBy,
          creator.createdAt,
          totalPaidSoFar
        );
        // Creator keeps full amount (no deduction)
        creatorAmount = split.creatorAmount;

        if (split.referralFee > 0 && split.referrerId) {
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
          baselineViews: baselineViews ?? undefined,
          viewCount: viewCount ?? undefined,
          eligibleViews: eligibleViews ?? undefined,
          rejectionNote: status === "REJECTED" ? rejectionNote : null,
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
        include: { campaign: true, creator: true },
      });

      if (status === "APPROVED" && submission.application) {
        await tx.campaignApplication.update({
          where: { id: submission.application.id },
          data: {
            earnedAmount: { increment: Math.round(creatorAmount) },
          },
        });
      }

      return sub;
    });

    // Fire the unified notifier (in-app notification + Realtime + Discord DM)
    notifyVideoSubmissionReviewed({
      submissionId: updated.id,
      creatorUserId: updated.creatorId,
      creatorSupabaseId: updated.creator.supabaseId ?? null,
      creatorDiscordId: updated.creator.discordId ?? null,
      campaignName: updated.campaign.name,
      decision: status === "APPROVED" ? "APPROVE" : "REJECT",
      earnedAmount: status === "APPROVED" ? earnedAmount : undefined,
      rejectionNote,
    }).catch((err) => console.error("[video review notifier]", err));

    return NextResponse.json({ submission: updated });
  } catch (err: any) {
    console.error("[submissions review]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
