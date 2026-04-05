import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { notifySubmissionReview } from "@/lib/discord";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionNote: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await requireAuth("admin", "advertiser");
    const { id } = await params;

    const body = await req.json();
    const { status, rejectionNote } = reviewSchema.parse(body);

    const submission = await prisma.campaignSubmission.findUnique({
      where: { id },
      include: { campaign: true, application: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // If advertiser, verify they own the campaign
    if (role === "advertiser") {
      const user = await prisma.user.findUnique({
        where: { supabaseId: userId },
        select: { advertiserProfile: { select: { id: true } } },
      });
      if (!user?.advertiserProfile || submission.campaign.advertiserId !== user.advertiserProfile.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let earnedAmount = Number(submission.earnedAmount);
    if (status === "APPROVED") {
      const campaign = submission.campaign;
      earnedAmount = submission.claimedViews * Number(campaign.creatorCpv);
    }

    const updated = await prisma.campaignSubmission.update({
      where: { id },
      data: {
        status,
        earnedAmount,
        rejectionNote: status === "REJECTED" ? rejectionNote : null,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
      include: { campaign: true, creator: true },
    });

    if (status === "APPROVED" && submission.application) {
      await prisma.campaignApplication.update({
        where: { id: submission.application.id },
        data: {
          earnedAmount: { increment: Number(earnedAmount) },
        },
      });
    }

    await prisma.notification.create({
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

    // Send Discord DM to creator (non-blocking)
    notifySubmissionReview({
      creatorDiscordId: updated.creator.discordId ?? null,
      status,
      campaignName: updated.campaign.name,
      earnedAmount: status === "APPROVED" ? earnedAmount : undefined,
      rejectionNote,
    }).catch((err) => console.error("[discord dm notify]", err));

    return NextResponse.json({ submission: updated });
  } catch (err: any) {
    console.error("[submissions review]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
