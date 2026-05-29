import { getAdminFleetStats } from "@/lib/stats/admin";
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

export default async function AdminStatsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const stats = await getAdminFleetStats(range);

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Statistieken" }]} />
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            Fleetprestaties
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {range.label} over alle creators en platformen
          </p>
        </div>
        <TimeRangeSelector value={range.key} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Fleetviews"
          value={stats.fleetViews.value.toLocaleString("nl-NL")}
          trend={stats.fleetViews.delta}
          hint={range.label}
        />
        <KpiCard
          label="Unieke creators"
          value={stats.activeCreators.value.toLocaleString("nl-NL")}
          hint="minimaal 1 geverifieerde koppeling"
        />
        <KpiCard
          label="Effectieve CPM"
          value={`€${(stats.effectiveCpv.value * 1_000).toFixed(2)}`}
          trend={stats.effectiveCpv.delta}
          hint={range.label}
        />
        <KpiCard
          label="Accountkoppelingssucces"
          value={`${stats.oauthSuccessRate.value.toFixed(1)}%`}
          trend={stats.oauthSuccessRate.delta}
          tone={stats.oauthSuccessRate.value < 80 ? "warning" : "success"}
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
              href={`/admin/stats/${slug}${range.key !== "30d" ? `?range=${range.key}` : ""}`}
              connectionCount={p.connectionCount}
              followerCount={p.followerCount}
              windowViews={p.windowViews}
              windowEngagement={p.windowEngagement}
              topPostTitle={p.topCreator?.displayName ?? null}
              topPostViews={p.topCreator?.views ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
