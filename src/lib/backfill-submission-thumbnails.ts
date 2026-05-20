import { prisma } from "@/lib/prisma";
import {
  isUnstableProviderThumbnailUrl,
  resolveStableSubmissionThumbnail,
} from "@/lib/clip-thumbnail";
import type { ClipMediaType } from "@/lib/instagram-media-type";

interface BackfillOptions {
  limit?: number;
  dryRun?: boolean;
}

export interface ThumbnailBackfillResult {
  scanned: number;
  resolved: number;
  unresolved: string[];
  skipped: string[];
}

export async function backfillSubmissionThumbnails({
  limit = 500,
  dryRun = false,
}: BackfillOptions = {}): Promise<ThumbnailBackfillResult> {
  const submissions = await prisma.campaignSubmission.findMany({
    where: {
      OR: [
        { thumbnailUrl: null },
        { thumbnailUrl: { contains: "tiktokcdn", mode: "insensitive" } },
        { thumbnailUrl: { contains: "cdninstagram.com", mode: "insensitive" } },
        { thumbnailUrl: { contains: "fbcdn.net", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      postUrl: true,
      thumbnailUrl: true,
      mediaType: true,
      creatorId: true,
    },
  });

  const result: ThumbnailBackfillResult = {
    scanned: submissions.length,
    resolved: 0,
    unresolved: [],
    skipped: [],
  };

  for (const submission of submissions) {
    const needsBackfill =
      !submission.thumbnailUrl ||
      isUnstableProviderThumbnailUrl(submission.thumbnailUrl);

    if (!needsBackfill) {
      result.skipped.push(submission.id);
      continue;
    }

    if (dryRun) {
      result.skipped.push(submission.id);
      continue;
    }

    const resolved = await resolveStableSubmissionThumbnail({
      postUrl: submission.postUrl,
      creatorId: submission.creatorId,
      candidateThumbnailUrl: submission.thumbnailUrl,
      candidateMediaType: asClipMediaType(submission.mediaType),
      submissionId: submission.id,
    });

    if (resolved.thumbnailUrl) {
      result.resolved += 1;
    } else {
      result.unresolved.push(submission.id);
    }
  }

  return result;
}

function asClipMediaType(value: string | null | undefined): ClipMediaType | null {
  if (value === "video" || value === "image" || value === "carousel") return value;
  return null;
}
