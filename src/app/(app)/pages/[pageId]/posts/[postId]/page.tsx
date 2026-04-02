import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ViewsChart } from "@/components/analytics/views-chart";
import type { IgMediaItem } from "@/types/instagram";

export default async function PostStatsPage({
  params,
}: {
  params: Promise<{ pageId: string; postId: string }>;
}) {
  const { pageId, postId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!user?.creatorProfile) redirect("/onboarding");

  // Fetch the social account (page) — verify ownership
  const page = await prisma.socialAccount.findUnique({
    where: { id: pageId, creatorProfileId: user.creatorProfile.id },
    select: { id: true, platformUsername: true, igMediaCache: true },
  });
  if (!page) notFound();

  const mediaCache = (page.igMediaCache as IgMediaItem[] | null) ?? [];
  const mediaItem = mediaCache.find((m) => m.id === postId);
  if (!mediaItem) notFound();

  // Fetch lifetime Instagram stats from MediaInsightSnapshot (populated by sync-media-insights cron + story webhook)
  const mediaInsight = await prisma.mediaInsightSnapshot.findUnique({
    where: { igMediaId: postId },
  });

  // Find the CampaignPost for this media (if any) to get snapshots
  const campaignPost = await prisma.campaignPost.findFirst({
    where: {
      platformPostId: postId,
      socialAccountId: pageId,
    },
    include: {
      snapshots: {
        orderBy: { capturedAt: "asc" },
        select: {
          capturedAt: true,
          viewsCount: true,
          likesCount: true,
          commentsCount: true,
          reach: true,
          savedCount: true,
          sharesCount: true,
          avgWatchTimeMs: true,
          totalWatchTimeMs: true,
          profileVisits: true,
          followsFromPost: true,
        },
      },
      application: {
        include: { campaign: { select: { id: true, name: true } } },
      },
    },
  });

  const snapshots = campaignPost?.snapshots ?? [];
  const latest = snapshots.at(-1);

  // Chart data for views over time
  const chartData = snapshots.map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    views: s.viewsCount,
    reach: s.reach ?? 0,
  }));

  const isReel =
    mediaItem.media_product_type === "REELS" ||
    mediaItem.media_type === "VIDEO";

  const formatMs = (ms: number | null | undefined) => {
    if (!ms) return null;
    const secs = Math.round(ms / 1000);
    return secs >= 60
      ? `${Math.floor(secs / 60)}m ${secs % 60}s`
      : `${secs}s`;
  };

  // Prefer MediaInsightSnapshot (lifetime aggregate from Instagram API) over ViewSnapshot for display
  // ViewSnapshot is kept for the time-series chart (campaign CPV tracking)
  const lifetimeViews = mediaInsight?.views ?? latest?.viewsCount;
  const lifetimeReach = mediaInsight?.reach ?? latest?.reach;
  const lifetimeLikes = mediaInsight?.likes ?? latest?.likesCount;
  const lifetimeComments = mediaInsight?.comments ?? latest?.commentsCount;
  const lifetimeSaved = mediaInsight?.saved ?? latest?.savedCount;
  const lifetimeShares = mediaInsight?.shares ?? latest?.sharesCount;
  const lifetimeProfileVisits = mediaInsight?.profileVisits ?? latest?.profileVisits;
  const lifetimeFollows = mediaInsight?.follows ?? latest?.followsFromPost;
  const lifetimeAvgWatch = mediaInsight?.avgWatchTime ?? latest?.avgWatchTimeMs;
  const lifetimeTotalWatch = mediaInsight?.totalWatchTime ?? latest?.totalWatchTimeMs;

  // STORY-only metrics (only available from webhook via MediaInsightSnapshot)
  const storyReplies = mediaInsight?.replies;
  const navForward = mediaInsight?.navigationForward;
  const navBack = mediaInsight?.navigationBack;
  const navExit = mediaInsight?.navigationExit;

  const statCards = [
    { label: "Views", value: lifetimeViews?.toLocaleString() ?? "—" },
    { label: "Reach", value: lifetimeReach?.toLocaleString() ?? "—" },
    { label: "Likes", value: lifetimeLikes?.toLocaleString() ?? "—" },
    { label: "Comments", value: lifetimeComments?.toLocaleString() ?? "—" },
    { label: "Saves", value: lifetimeSaved?.toLocaleString() ?? "—" },
    { label: "Shares", value: lifetimeShares?.toLocaleString() ?? "—" },
    { label: "Profile Visits", value: lifetimeProfileVisits?.toLocaleString() ?? "—" },
    { label: "Follows from Post", value: lifetimeFollows?.toLocaleString() ?? "—" },
    ...(isReel
      ? [
          { label: "Avg Watch Time", value: formatMs(lifetimeAvgWatch) ?? "—" },
          { label: "Total Watch Time", value: formatMs(lifetimeTotalWatch) ?? "—" },
        ]
      : []),
    ...(mediaInsight?.mediaType === "STORY"
      ? [
          { label: "Replies", value: storyReplies?.toLocaleString() ?? "—" },
          { label: "Taps Forward", value: navForward?.toLocaleString() ?? "—" },
          { label: "Taps Back", value: navBack?.toLocaleString() ?? "—" },
          { label: "Exits", value: navExit?.toLocaleString() ?? "—" },
        ]
      : []),
  ];

  const thumbnailSrc = mediaItem.thumbnail_url ?? mediaItem.media_url;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/pages" className="hover:text-gray-700">My Pages</Link>
        <span>/</span>
        <Link href={`/pages/${pageId}`} className="hover:text-gray-700">@{page.platformUsername}</Link>
        <span>/</span>
        <span className="text-gray-900">Post Stats</span>
      </div>

      {/* Post header */}
      <div className="flex items-start gap-4">
        {thumbnailSrc ? (
          <div className="w-24 h-24 rounded-xl overflow-hidden relative shrink-0 bg-gray-100">
            <Image src={thumbnailSrc} alt="" fill className="object-cover" />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 text-xs">
            No preview
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize">
              {mediaItem.media_product_type?.toLowerCase() ?? mediaItem.media_type?.toLowerCase() ?? "post"}
            </span>
            {campaignPost?.application?.campaign && (
              <Link
                href={`/campaigns/${campaignPost.application.campaign.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                {campaignPost.application.campaign.name}
              </Link>
            )}
          </div>
          {mediaItem.caption && (
            <p className="text-sm text-gray-700 line-clamp-3">{mediaItem.caption}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Posted {new Date(mediaItem.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      {!mediaInsight && snapshots.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">No tracked stats yet. Instagram stats sync daily — check back tomorrow.</p>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Instagram Stats
              {mediaInsight && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  lifetime · updated {new Date(mediaInsight.fetchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {chartData.length > 1 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Views Over Time (Campaign Tracking)</h2>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <ViewsChart data={chartData} />
              </div>
            </div>
          )}

          {(lifetimeLikes != null || lifetimeSaved != null) && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Engagement Breakdown</h2>
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                {[
                  { label: "Likes", value: lifetimeLikes ?? 0, color: "bg-rose-400" },
                  { label: "Comments", value: lifetimeComments ?? 0, color: "bg-amber-400" },
                  { label: "Saves", value: lifetimeSaved ?? 0, color: "bg-blue-400" },
                  { label: "Shares", value: lifetimeShares ?? 0, color: "bg-purple-400" },
                ].map((item) => {
                  const total = (lifetimeLikes ?? 0) + (lifetimeComments ?? 0) + (lifetimeSaved ?? 0) + (lifetimeShares ?? 0);
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <p className="text-xs text-gray-500 w-20 shrink-0">{item.label}</p>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-700 w-10 text-right">{item.value.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
