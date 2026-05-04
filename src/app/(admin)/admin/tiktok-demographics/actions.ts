"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

const MIN_REASON_LENGTH = 10;

export async function reviewTikTokDemographic(
  submissionId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNotes?: string,
) {
  const { userId } = await requireAuth("admin");

  const trimmed = reviewNotes?.trim() ?? "";
  if (decision === "REJECTED" && trimmed.length < MIN_REASON_LENGTH) {
    throw new Error(`Decline reason is required (min ${MIN_REASON_LENGTH} characters)`);
  }

  const submission = await prisma.tikTokDemographicSubmission.findUnique({
    where: { id: submissionId },
    include: {
      connection: {
        select: {
          id: true,
          username: true,
          creatorProfile: {
            select: {
              user: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!submission) throw new Error("Submission not found");
  if (submission.status !== VerificationStatus.PENDING) {
    throw new Error("Submission has already been reviewed");
  }

  const newStatus =
    decision === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.FAILED;

  await prisma.tikTokDemographicSubmission.update({
    where: { id: submissionId },
    data: {
      status: newStatus,
      reviewNotes: trimmed || null,
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });

  // On approval, write a fresh AudienceSnapshot for the connection so the
  // creator's TikTok page renders the live card. Page reads `share` (0-1)
  // and `genderSplit`/`ageBuckets` as fractions, so convert from percent.
  if (decision === "APPROVED") {
    const topCountriesRaw = Array.isArray(submission.topCountries)
      ? (submission.topCountries as { iso: string; percent: number }[])
      : [
          {
            iso: submission.topCountry,
            percent: submission.topCountryPercent,
          },
        ];
    const topCountries = topCountriesRaw
      .filter((c) => c?.iso && Number.isFinite(c.percent))
      .map((c) => ({ code: c.iso, share: c.percent / 100 }));

    const ageBucketsRaw =
      typeof submission.ageBuckets === "object" && submission.ageBuckets !== null
        ? (submission.ageBuckets as Record<string, number>)
        : {};
    const ageBuckets = Object.fromEntries(
      Object.entries(ageBucketsRaw).map(([k, v]) => [k, Number(v) / 100]),
    );

    const genderSplit = {
      male: submission.malePercent / 100,
      female: submission.femalePercent / 100,
      other: submission.otherPercent / 100,
    };

    await prisma.audienceSnapshot.create({
      data: {
        connectionType: "TT",
        connectionId: submission.connectionId,
        source: "SELF_REPORT",
        kind: "FOLLOWER",
        ageBuckets,
        genderSplit,
        topCountries,
        raw: { submissionId: submission.id, reviewedBy: userId },
      },
    });
  }

  // Notify the creator (uses existing DEMOGRAPHICS_VERIFIED / DEMOGRAPHICS_REJECTED enum types).
  const creatorUserId = submission.connection.creatorProfile.user.id;
  try {
    await dispatchNotification(
      creatorUserId,
      decision === "APPROVED" ? "DEMOGRAPHICS_VERIFIED" : "DEMOGRAPHICS_REJECTED",
      {
        submissionId: submission.id,
        connectionId: submission.connectionId,
        username: submission.connection.username,
        reviewNotes: trimmed || null,
      },
    );
  } catch (err) {
    console.error("[tiktok-demographics] creator notification failed", err);
  }

  revalidatePath("/admin/tiktok-demographics");
  revalidatePath(`/creator/stats/tt/${submission.connectionId}`);
}
