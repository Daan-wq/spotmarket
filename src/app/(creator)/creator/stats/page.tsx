import { requireAuth } from "@/lib/auth";
import { getCreatorTopStats } from "@/lib/stats/creator";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_ALL } from "@/lib/stats/types";
import { KpiCard } from "@/components/admin/kpi-card";
import { PlatformTile } from "@/components/stats/PlatformTile";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { Breadcrumbs } from "@/components/stats/Breadcrumbs";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function CreatorStatsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { userId } = await requireAuth("creator");
  const stats = await getCreatorTopStats(userId, range);

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Stats</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          We couldn&apos;t find your creator profile. Please complete onboarding first.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Stats" }]} />
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            Your performance
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {range.label} across all platforms
          </p>
        </div>
        <TimeRangeSelector value={range.key} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total views"
          value={stats.totalViews.value.toLocaleString()}
          trend={stats.totalViews.delta}
          hint={range.label}
        />
        <KpiCard
          label="Total followers"
          value={stats.totalFollowers.value.toLocaleString()}
          hint="Latest snapshot"
        />
        <KpiCard
          label="Engagement"
          value={stats.totalEngagement.value.toLocaleString()}
          trend={stats.totalEngagement.delta}
          hint="Likes + comments + shares"
        />
        <KpiCard
          label="Earnings"
          value={`$${stats.totalEarnings.value.toFixed(2)}`}
          trend={stats.totalEarnings.delta}
          hint={range.label}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORM_ALL.map((slug) => {
          const p = stats.byPlatform[slug];
          return (
            <PlatformTile
              key={slug}
              slug={slug}
              href={`/creator/stats/${slug}${range.key !== "30d" ? `?range=${range.key}` : ""}`}
              connectionCount={p.connectionCount}
              followerCount={p.followerCount}
              windowViews={p.windowViews}
              windowEngagement={p.windowEngagement}
              topPostTitle={p.topPost?.title}
              topPostViews={p.topPost?.views}
            />
          );
        })}
      </div>
    </div>
  );
}
