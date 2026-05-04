import { prisma } from "@/lib/prisma";
import { type Range, withinRange } from "./range";
import type { PlatformSlug } from "./types";

export interface ContentRowBase {
  submissionId: string;
  title: string;
  postUrl: string;
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  // Optional / platform-specific
  saves?: number | null;
  reach?: number | null;
  totalInteractions?: number | null;
  follows?: number | null;
  profileVisits?: number | null;
  watchTimeSec?: number | null;
  // Per-platform extras attached as raw JSON (UI inspects)
  extras?: Record<string, unknown> | null;
}

export interface ContentRow extends ContentRowBase {
  creatorDisplayName?: string;
}

interface ContentQueryArgs {
  submissionIds: string[];
  range: Range;
  includeCreator?: boolean;
  platform: PlatformSlug;
}

/**
 * For each submission, fetch the latest MetricSnapshot in the window and project
 * platform-specific fields. Creator name attached optionally for admin views.
 */
export async function getContentRows({
  submissionIds,
  range,
  includeCreator,
  platform,
}: ContentQueryArgs): Promise<ContentRow[]> {
  if (submissionIds.length === 0) return [];
  const cap = withinRange(range);
  const latest = await prisma.metricSnapshot.findMany({
    where: {
      submissionId: { in: submissionIds },
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "desc" },
    distinct: ["submissionId"],
    select: {
      submissionId: true,
      capturedAt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      saveCount: true,
      reachCount: true,
      watchTimeSec: true,
      totalInteractions: true,
      followsFromMedia: true,
      profileVisits: true,
      profileActivity: true,
      reactionsByType: true,
      submission: {
        select: {
          postUrl: true,
          campaign: { select: { name: true } },
          ...(includeCreator
            ? { creator: { select: { creatorProfile: { select: { displayName: true } } } } }
            : {}),
        },
      },
    },
  });

  return latest.map((m) => {
    const extras: Record<string, unknown> = {};
    if (platform === "ig") {
      extras.profileActivity = m.profileActivity;
    }
    if (platform === "fb") {
      extras.reactionsByType = m.reactionsByType;
    }
    const sub = m.submission;
    type CreatorEmbed = { creator?: { creatorProfile?: { displayName?: string | null } | null } | null };
    const creatorEmbed = sub as (typeof sub & CreatorEmbed) | null;
    return {
      submissionId: m.submissionId,
      title: sub?.campaign?.name ?? sub?.postUrl ?? "Untitled",
      postUrl: sub?.postUrl ?? "",
      capturedAt: m.capturedAt,
      views: Number(m.viewCount),
      likes: m.likeCount ?? 0,
      comments: m.commentCount ?? 0,
      shares: m.shareCount ?? 0,
      saves: m.saveCount,
      reach: m.reachCount,
      totalInteractions: m.totalInteractions,
      follows: m.followsFromMedia,
      profileVisits: m.profileVisits,
      watchTimeSec: m.watchTimeSec,
      extras,
      ...(includeCreator
        ? { creatorDisplayName: creatorEmbed?.creator?.creatorProfile?.displayName ?? "Unknown" }
        : {}),
    };
  });
}
