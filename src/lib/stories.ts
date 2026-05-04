/**
 * Instagram Stories pipeline (Phase 3 of track-everything).
 *
 * Owner: A. Stories expire 24h after posting in the IG Graph API. We poll
 * `/{ig-user-id}/stories` hourly for verified IG connections and snapshot
 * lifetime metrics into `StoryPost`. Every snapshot updates the same row
 * (idempotent on `mediaId`) so we capture the final numbers right before
 * expiry. Reel-correlation is performed by `correlateStoryToNearbyReels`.
 */

import { Prisma } from "@prisma/client";
import type { CreatorIgConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  fetchActiveStories,
  fetchMediaInsights,
  type IgStoryItem,
  type MediaInsightResult,
} from "@/lib/instagram";
import { recordRawApiResponse } from "@/lib/metrics/raw-storage";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const CORRELATION_WINDOW_MS = 2 * 60 * 60 * 1000;

export interface StorySnapshotResult {
  connectionId: string;
  fetched: number;
  upserted: number;
  failed: number;
  correlations: number;
}

export async function pollStoriesForConnection(
  conn: CreatorIgConnection,
): Promise<StorySnapshotResult> {
  const result: StorySnapshotResult = {
    connectionId: conn.id,
    fetched: 0,
    upserted: 0,
    failed: 0,
    correlations: 0,
  };

  if (!conn.accessToken || !conn.accessTokenIv || !conn.igUserId) return result;

  let token: string;
  try {
    token = decrypt(conn.accessToken, conn.accessTokenIv);
  } catch {
    return result;
  }

  let stories: IgStoryItem[];
  try {
    stories = await fetchActiveStories(token, conn.igUserId);
  } catch (err) {
    console.warn(`[stories] fetch failed for ${conn.id}: ${(err as Error).message}`);
    return result;
  }
  result.fetched = stories.length;

  for (const s of stories) {
    let insights: MediaInsightResult | null = null;
    try {
      insights = await fetchMediaInsights(s.id, token, "STORY");
    } catch (err) {
      console.warn(`[stories] insights failed ${s.id}: ${(err as Error).message}`);
    }

    try {
      const upserted = await persistStorySnapshot(conn.id, s, insights);
      result.upserted++;

      const correlated = await correlateStoryToNearbyReels(
        upserted.id,
        conn.id,
        upserted.postedAt,
      );
      result.correlations += correlated;
    } catch (err) {
      result.failed++;
      console.error(`[stories] persist failed ${s.id}:`, err);
    }
  }

  return result;
}

export async function persistStorySnapshot(
  connectionId: string,
  story: IgStoryItem,
  insights: MediaInsightResult | null,
): Promise<{ id: string; postedAt: Date }> {
  const postedAt = new Date(story.timestamp);
  const expiresAt = new Date(postedAt.getTime() + STORY_LIFETIME_MS);

  const profileActivity =
    insights == null ||
    (insights.profileActivityBioLink == null &&
      insights.profileActivityCall == null &&
      insights.profileActivityDirection == null &&
      insights.profileActivityEmail == null &&
      insights.profileActivityText == null)
      ? null
      : {
          BIO_LINK_CLICKED: insights.profileActivityBioLink,
          CALL: insights.profileActivityCall,
          DIRECTION: insights.profileActivityDirection,
          EMAIL: insights.profileActivityEmail,
          TEXT: insights.profileActivityText,
        };

  const data = {
    connectionId,
    mediaId: story.id,
    postedAt,
    expiresAt,
    mediaType: story.media_type,
    mediaProductType: story.media_product_type,
    permalink: story.permalink,
    reach: insights?.reach ?? null,
    views: insights?.views ?? null,
    replies: insights?.replies ?? null,
    follows: insights?.follows ?? null,
    profileVisits: insights?.profileVisits ?? null,
    totalInteractions: insights?.totalInteractions ?? null,
    shares: insights?.shares ?? null,
    tapsForward: insights?.navigationForward ?? null,
    tapsBack: insights?.navigationBack ?? null,
    tapsExit: insights?.navigationExit ?? null,
    swipeForward: insights?.navigationNextStory ?? null,
    profileActivity:
      profileActivity == null ? Prisma.JsonNull : (profileActivity as Prisma.InputJsonValue),
    lastPolledAt: new Date(),
    raw: { story, insights } as unknown as Prisma.InputJsonValue,
  };

  const upserted = await prisma.storyPost.upsert({
    where: { mediaId: story.id },
    create: data,
    update: data,
    select: { id: true, postedAt: true },
  });

  await recordRawApiResponse({
    connectionType: "IG",
    connectionId,
    endpoint: "instagram.story.insights",
    payload: { story, insights },
  });

  return upserted;
}

/**
 * Find any reel/feed campaign submissions by this IG connection's creator that
 * were posted within ±CORRELATION_WINDOW_MS of the story, and write
 * StoryReelCorrelation rows. Idempotent via the (storyId, submissionId) unique.
 */
export async function correlateStoryToNearbyReels(
  storyId: string,
  connectionId: string,
  storyPostedAt: Date,
): Promise<number> {
  const conn = await prisma.creatorIgConnection.findUnique({
    where: { id: connectionId },
    select: { creatorProfileId: true },
  });
  if (!conn) return 0;

  const profile = await prisma.creatorProfile.findUnique({
    where: { id: conn.creatorProfileId },
    select: { userId: true },
  });
  if (!profile) return 0;

  const since = new Date(storyPostedAt.getTime() - CORRELATION_WINDOW_MS);
  const until = new Date(storyPostedAt.getTime() + CORRELATION_WINDOW_MS);

  const reels = await prisma.campaignSubmission.findMany({
    where: {
      creatorId: profile.userId,
      createdAt: { gte: since, lte: until },
      postUrl: { contains: "instagram.com" },
    },
    select: { id: true, createdAt: true },
  });

  let written = 0;
  for (const reel of reels) {
    const deltaMin = Math.round((reel.createdAt.getTime() - storyPostedAt.getTime()) / 60_000);
    try {
      await prisma.storyReelCorrelation.upsert({
        where: { storyId_submissionId: { storyId, submissionId: reel.id } },
        create: { storyId, submissionId: reel.id, deltaMinutes: deltaMin },
        update: { deltaMinutes: deltaMin },
      });
      written++;
    } catch (err) {
      console.warn(`[stories] correlation upsert failed: ${(err as Error).message}`);
    }
  }
  return written;
}
