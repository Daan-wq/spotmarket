"use server";

import { requireAuth } from "@/lib/auth";
import { reviewDemographicsSubmission } from "@/lib/submission-review";
import { revalidatePath } from "next/cache";

export async function reviewTikTokDemographic(
  submissionId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNotes?: string
) {
  const { userId } = await requireAuth("admin");

  await reviewDemographicsSubmission({
    submissionId,
    decision: decision === "APPROVED" ? "APPROVE" : "REJECT",
    reason: reviewNotes,
    reviewerSupabaseId: userId,
  });

  revalidatePath("/admin/review/demographics");
}
