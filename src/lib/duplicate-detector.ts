/**
 * Duplicate detector for global platform video identities.
 *
 * The durable key is normalizedPlatform + platformVideoId. URL matching only
 * remains as a fallback for legacy rows that have not been backfilled yet.
 */

import { prisma } from "@/lib/prisma";
import { parseClipUrl, type ParsedClipUrl } from "@/lib/parse-clip-url";

export interface DuplicateMatch {
  submissionId: string;
  campaignId: string;
  creatorId: string;
  matchType: "platform_video_id" | "url";
}

export interface DuplicateInput {
  postUrl: string;
  parsed?: ParsedClipUrl;
  /** Accepted for older callers. Duplicate checks are intentionally global. */
  campaignId?: string;
  excludeSubmissionId?: string;
}

export async function findDuplicate(input: DuplicateInput): Promise<DuplicateMatch | null> {
  const parsed = input.parsed ?? parseClipUrl(input.postUrl);

  if (parsed.normalizedPlatform && parsed.platformVideoId) {
    const identityMatch = await prisma.campaignSubmission.findFirst({
      where: {
        normalizedPlatform: parsed.normalizedPlatform,
        platformVideoId: parsed.platformVideoId,
        ...(input.excludeSubmissionId ? { id: { not: input.excludeSubmissionId } } : {}),
      },
      select: { id: true, campaignId: true, creatorId: true },
    });
    if (identityMatch) {
      return {
        submissionId: identityMatch.id,
        campaignId: identityMatch.campaignId,
        creatorId: identityMatch.creatorId,
        matchType: "platform_video_id",
      };
    }
  }

  const urlExact = await prisma.campaignSubmission.findFirst({
    where: {
      postUrl: input.postUrl,
      OR: [{ normalizedPlatform: null }, { platformVideoId: null }],
      ...(input.excludeSubmissionId ? { id: { not: input.excludeSubmissionId } } : {}),
    },
    select: { id: true, campaignId: true, creatorId: true },
  });
  if (!urlExact) return null;

  return {
    submissionId: urlExact.id,
    campaignId: urlExact.campaignId,
    creatorId: urlExact.creatorId,
    matchType: "url",
  };
}
