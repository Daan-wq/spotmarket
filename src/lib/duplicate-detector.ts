/**
 * Duplicate detector — URL + author handle dedupe.
 *
 * Owner: A. No phash, no content fingerprint — just exact URL normalization
 * (postId from parseClipUrl) + handle. The check applies platform-wide so
 * a creator can't reuse the same clip across campaigns either.
 */

import { prisma } from "@/lib/prisma";
import { parseClipUrl, normalizeHandle } from "@/lib/parse-clip-url";

export interface DuplicateMatch {
  submissionId: string;
  campaignId: string;
  creatorId: string;
  matchType: "url" | "url+handle";
}

export interface DuplicateInput {
  postUrl: string;
  /** Optional — when provided, restricts the search to a single campaign. */
  campaignId?: string;
  /** When provided, the candidate's own creator id (so existing rows from this
   *  creator on a different campaign still count as duplicates). */
  excludeSubmissionId?: string;
}

/**
 * Returns the first matching prior submission, or null.
 * Match strategy:
 *   1. Exact postUrl match (covers normal cases).
 *   2. Same parsed postId + same authorHandle (covers shortlinks / different
 *      query params on the URL). Implemented as a postUrl substring search.
 */
export async function findDuplicate(
  input: DuplicateInput,
): Promise<DuplicateMatch | null> {
  const parsed = parseClipUrl(input.postUrl);
  const postId = parsed.postId;
  const handle = normalizeHandle(parsed.authorHandle);

  // 1) Exact URL match
  const urlExact = await prisma.campaignSubmission.findFirst({
    where: {
      postUrl: input.postUrl,
      ...(input.campaignId ? { campaignId: input.campaignId } : {}),
      ...(input.excludeSubmissionId ? { id: { not: input.excludeSubmissionId } } : {}),
    },
    select: { id: true, campaignId: true, creatorId: true },
  });
  if (urlExact) {
    return {
      submissionId: urlExact.id,
      campaignId: urlExact.campaignId,
      creatorId: urlExact.creatorId,
      matchType: "url",
    };
  }

  // 2) postId + handle (same clip submitted from a different URL form)
  if (postId && handle) {
    const candidates = await prisma.campaignSubmission.findMany({
      where: {
        postUrl: { contains: postId },
        authorHandle: handle,
        ...(input.campaignId ? { campaignId: input.campaignId } : {}),
        ...(input.excludeSubmissionId ? { id: { not: input.excludeSubmissionId } } : {}),
      },
      select: { id: true, campaignId: true, creatorId: true, postUrl: true },
      take: 5,
    });
    for (const c of candidates) {
      const cParsed = parseClipUrl(c.postUrl);
      if (cParsed.postId === postId) {
        return {
          submissionId: c.id,
          campaignId: c.campaignId,
          creatorId: c.creatorId,
          matchType: "url+handle",
        };
      }
    }
  }

  return null;
}
