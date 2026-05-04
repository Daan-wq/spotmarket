import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideosClient } from "./_components/videos-client";

type UnderperformPayload = {
  weakDimensions?: Array<"views" | "likeRatio" | "commentRatio" | "watchTime">;
  reason?: string;
};

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

  // Pull unresolved "underperform" signals for this clipper's submissions.
  // Subsystem B writes these. We read directly from Prisma — the integration
  // contract across subsystems is the schema, not cross-imports.
  // The schema enum doesn't have an UNDERPERFORM type; B records underperform
  // events as VELOCITY_DROP / RATIO_ANOMALY signals with weakDimensions in the
  // payload, matching the SubmissionUnderperformEvent contract.
  const submissionIds = submissions.map((s) => s.id);
  const signals = submissionIds.length
    ? await prisma.submissionSignal.findMany({
        where: {
          submissionId: { in: submissionIds },
          resolvedAt: null,
          type: { in: ["VELOCITY_DROP", "RATIO_ANOMALY"] },
        },
        select: {
          submissionId: true,
          type: true,
          severity: true,
          payload: true,
          createdAt: true,
        },
      })
    : [];

  const underperformBySubmission = new Map<
    string,
    { weakDimensions: string[]; reason: string | null }
  >();
  for (const sig of signals) {
    const payload = (sig.payload ?? {}) as UnderperformPayload;
    const existing = underperformBySubmission.get(sig.submissionId);
    const weakSet = new Set(existing?.weakDimensions ?? []);
    if (Array.isArray(payload.weakDimensions)) {
      for (const d of payload.weakDimensions) weakSet.add(d);
    } else if (sig.type === "VELOCITY_DROP") {
      weakSet.add("views");
    } else if (sig.type === "RATIO_ANOMALY") {
      weakSet.add("likeRatio");
    }
    underperformBySubmission.set(sig.submissionId, {
      weakDimensions: Array.from(weakSet),
      reason: payload.reason ?? existing?.reason ?? null,
    });
  }

  const videos = submissions.map((s) => {
    const u = underperformBySubmission.get(s.id);
    return {
      id: s.id,
      postUrl: s.postUrl,
      status: s.status,
      earned: Number(s.earnedAmount),
      views: s.viewCount ?? s.claimedViews,
      createdAt: s.createdAt.toISOString(),
      campaignName: s.campaign.name,
      brandName: s.campaign.name,
      platform: s.campaign.platform,
      underperform: u ?? null,
    };
  });

  const statusCounts = {
    PENDING: videos.filter((v) => v.status === "PENDING").length,
    FLAGGED: videos.filter((v) => v.status === "FLAGGED").length,
    REJECTED: videos.filter((v) => v.status === "REJECTED").length,
    APPROVED: videos.filter((v) => v.status === "APPROVED").length,
    ALL: videos.length,
  };

  return <VideosClient videos={videos} statusCounts={statusCounts} />;
}
