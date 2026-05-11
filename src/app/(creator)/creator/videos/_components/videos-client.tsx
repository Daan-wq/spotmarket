"use client";

import EarningsCard from "@/components/shared/EarningsCard";
import {
  SubmittedClipsList,
  type SubmittedClipData,
} from "@/components/submissions/submitted-clips-list";
import {
  CreatorPageHeader,
  SoftStat,
} from "../../_components/creator-journey";

interface VideosClientProps {
  videos: SubmittedClipData[];
  statusCounts: Record<string, number>;
  totalEarnedProjected: number;
}

export function VideosClient({
  videos,
  statusCounts,
  totalEarnedProjected,
}: VideosClientProps) {
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const hasUnsettled = videos.some((v) => v.status !== "APPROVED");

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader eyebrow="Submitted clips" title="Clips" />

      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SoftStat
            label="Total clips"
            value={videos.length.toString()}
            detail="All submissions"
          />
          <SoftStat
            label="Total views"
            value={totalViews.toLocaleString()}
            detail="Tracked or claimed"
          />
          <EarningsCard
            amount={totalEarnedProjected}
            disclaimer={
              hasUnsettled
                ? "Posts have to be accepted for the earnings to enter the wallet."
                : null
            }
          />
        </div>

        <div className="mt-6">
          <SubmittedClipsList
            videos={videos}
            statusCounts={statusCounts}
            mode="creator"
            detailBasePath="/creator/videos"
            emptyState={{
              title: "No clips yet",
              description: "Submit your first clip from a campaign you've joined to start earning.",
              primaryCta: { label: "Browse campaigns", href: "/creator/campaigns" },
              secondaryCta: { label: "Connect an account", href: "/creator/connections" },
            }}
          />
        </div>
      </section>
    </div>
  );
}
