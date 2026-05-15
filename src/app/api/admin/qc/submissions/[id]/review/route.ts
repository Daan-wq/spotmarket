import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";

const score = z.coerce.number().int().min(1).max(10).optional().nullable();

const qcReviewSchema = z.object({
  hookScore: score,
  pacingScore: score,
  captionsScore: score,
  brandFitScore: score,
  logoPresent: z.boolean().optional().nullable(),
  noSpellingMistakes: z.boolean().optional(),
  correctFormat: z.boolean().optional(),
  audioQuality: z.boolean().optional(),
  ctaIncluded: z.boolean().optional(),
  decision: z.enum(["APPROVED", "REVISION", "REJECTED"]),
  notes: z.string().max(5000).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const data = qcReviewSchema.parse(await req.json());

    const submission = await prisma.campaignSubmission.findUnique({
      where: { id },
      select: { id: true, productionAssignmentId: true },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.qcReview.create({
        data: {
          submissionId: id,
          reviewerId: userId,
          hookScore: data.hookScore,
          pacingScore: data.pacingScore,
          captionsScore: data.captionsScore,
          brandFitScore: data.brandFitScore,
          logoPresent: data.logoPresent,
          noSpellingMistakes: data.noSpellingMistakes ?? false,
          correctFormat: data.correctFormat ?? false,
          audioQuality: data.audioQuality ?? false,
          ctaIncluded: data.ctaIncluded ?? false,
          decision: data.decision,
          notes: data.notes,
        },
      });

      const nextSubmissionStatus =
        data.decision === "APPROVED" ? "APPROVED" : data.decision === "REJECTED" ? "REJECTED" : "NEEDS_REVISION";
      const nextAssignmentStatus =
        data.decision === "APPROVED" ? "APPROVED" : data.decision === "REJECTED" ? "REJECTED" : "NEEDS_REVISION";

      const updatedSubmission = await tx.campaignSubmission.update({
        where: { id },
        data: {
          status: nextSubmissionStatus,
          reviewedAt: new Date(),
          reviewedBy: userId,
          rejectionNote: data.decision === "REJECTED" || data.decision === "REVISION" ? data.notes : undefined,
          logoStatus: data.logoPresent == null ? undefined : data.logoPresent ? "PRESENT" : "MISSING",
          logoVerifiedAt: data.logoPresent == null ? undefined : new Date(),
          logoVerifiedBy: data.logoPresent == null ? undefined : userId,
        },
      });

      if (submission.productionAssignmentId) {
        await tx.productionAssignment.update({
          where: { id: submission.productionAssignmentId },
          data: {
            status: nextAssignmentStatus,
            revisionNotes: data.decision === "REVISION" ? data.notes : undefined,
            submittedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: `qc.${data.decision.toLowerCase()}`,
          entityType: "CampaignSubmission",
          entityId: id,
          metadata: { reviewId: review.id },
        },
      });

      return { review, submission: updatedSubmission };
    });

    return NextResponse.json(serialize(result), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/qc/submissions/[id]/review]");
  }
}
