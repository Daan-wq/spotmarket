"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function reviewTikTokDemographic(
  submissionId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNotes?: string
) {
  const { userId } = await requireAuth("admin");

  await prisma.tikTokDemographicSubmission.update({
    where: { id: submissionId },
    data: {
      status: decision === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
      reviewNotes: reviewNotes?.trim() || null,
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/tiktok-demographics");
}
