import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideosClient } from "./_components/videos-client";

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
      status: true,
      earnedAmount: true,
      claimedViews: true,
      viewCount: true,
      createdAt: true,
      campaign: {
        select: {
          name: true,
          platform: true,
        },
      },
    },
  });

  const videos = submissions.map((s) => ({
    id: s.id,
    postUrl: s.postUrl,
    status: s.status,
    earned: Number(s.earnedAmount),
    views: s.viewCount ?? s.claimedViews,
    createdAt: s.createdAt.toISOString(),
    campaignName: s.campaign.name,
    brandName: s.campaign.name,
    platform: s.campaign.platform,
  }));

  const statusCounts = {
    PENDING: videos.filter((v) => v.status === "PENDING").length,
    FLAGGED: videos.filter((v) => v.status === "FLAGGED").length,
    REJECTED: videos.filter((v) => v.status === "REJECTED").length,
    APPROVED: videos.filter((v) => v.status === "APPROVED").length,
    ALL: videos.length,
  };

  return <VideosClient videos={videos} statusCounts={statusCounts} />;
}
