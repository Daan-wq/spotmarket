import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveThumbnail } from "@/lib/clip-thumbnail";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import {
  submissionProjectedEarnings,
  submissionViews,
  totalProjectedEarnings,
} from "@/lib/earnings";
import { VideosClient } from "./_components/videos-client";

const CLIP_TO_PLATFORM_ICON: Record<ClipPlatform, string | null> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE_SHORTS",
  UNKNOWN: null,
};

function platformIconFromSourcePlatform(sourcePlatform: string | null | undefined): string | null {
  if (sourcePlatform === "INSTAGRAM") return "INSTAGRAM";
  if (sourcePlatform === "TIKTOK") return "TIKTOK";
  if (sourcePlatform === "FACEBOOK") return "FACEBOOK";
  return null;
}

export default async function MyVideosPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const submissions = await prisma.campaignSubmission.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      postUrl: true,
      thumbnailUrl: true,
      mediaType: true,
      sourcePlatform: true,
      status: true,
      earnedAmount: true,
      claimedViews: true,
      viewCount: true,
      baselineViews: true,
      createdAt: true,
      campaign: {
        select: {
          name: true,
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
    },
  });

  type ClipMediaType = "video" | "image" | "carousel";
  const asClipMediaType = (v: string | null | undefined): ClipMediaType | null =>
    v === "video" || v === "image" || v === "carousel" ? v : null;

  const videos = await Promise.all(
    submissions.map(async (s) => {
      const parsed = s.postUrl ? parseClipUrl(s.postUrl) : null;
      const derivedPlatform =
        (parsed ? CLIP_TO_PLATFORM_ICON[parsed.platform] : null) ??
        platformIconFromSourcePlatform(s.sourcePlatform);
      const { thumbnailUrl, mediaType } = await resolveThumbnail(
        s.postUrl,
        s.thumbnailUrl,
        {
          creatorId: user.id,
          submissionId: s.id,
          storedMediaType: asClipMediaType(s.mediaType),
        },
      );
      return {
        id: s.id,
        postUrl: s.postUrl,
        thumbnailUrl,
        mediaType,
        status: s.status,
        earned: submissionProjectedEarnings(s),
        views: submissionViews(s),
        createdAt: s.createdAt.toISOString(),
        campaignName: s.campaign.name,
        platform: derivedPlatform,
      };
    }),
  );

  const statusCounts = {
    PENDING: videos.filter((v) => v.status === "PENDING").length,
    FLAGGED: videos.filter((v) => v.status === "FLAGGED").length,
    REJECTED: videos.filter((v) => v.status === "REJECTED").length,
    APPROVED: videos.filter((v) => v.status === "APPROVED").length,
    ALL: videos.length,
  };

  const totalEarnedProjected = totalProjectedEarnings(submissions);

  return (
    <VideosClient
      videos={videos}
      statusCounts={statusCounts}
      totalEarnedProjected={totalEarnedProjected}
    />
  );
}
