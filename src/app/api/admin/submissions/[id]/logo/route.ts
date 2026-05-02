import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const bodySchema = z.object({
  logoStatus: z.enum(["PRESENT", "MISSING"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const body = await req.json();
    const { logoStatus } = bodySchema.parse(body);

    const submission = await prisma.campaignSubmission.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.campaignSubmission.update({
        where: { id },
        data: {
          logoStatus,
          logoVerifiedAt: now,
          logoVerifiedBy: userId,
        },
        select: {
          id: true,
          logoStatus: true,
          logoVerifiedAt: true,
          logoVerifiedBy: true,
        },
      });

      // If marking missing, raise a SubmissionSignal (LOGO_MISSING / WARN).
      // De-dupe by checking for an unresolved existing signal.
      if (logoStatus === "MISSING") {
        const existing = await tx.submissionSignal.findFirst({
          where: {
            submissionId: id,
            type: "LOGO_MISSING",
            resolvedAt: null,
          },
          select: { id: true },
        });
        if (!existing) {
          await tx.submissionSignal.create({
            data: {
              submissionId: id,
              type: "LOGO_MISSING",
              severity: "WARN",
              payload: {
                reason: "Manual admin review — logo not visible in submitted post",
                verifiedBy: userId,
              },
            },
          });
        }
      } else {
        // PRESENT → auto-resolve any open LOGO_MISSING signals for this submission.
        await tx.submissionSignal.updateMany({
          where: {
            submissionId: id,
            type: "LOGO_MISSING",
            resolvedAt: null,
          },
          data: {
            resolvedAt: now,
            resolvedBy: userId,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin logo] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
