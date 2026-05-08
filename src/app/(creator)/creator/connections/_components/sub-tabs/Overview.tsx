import Link from "next/link";
import { KpiCard } from "@/components/admin/kpi-card";
import { PlatformTile } from "@/components/stats/PlatformTile";
import { DailyViewsChart } from "@/components/stats/DailyViewsChart";
import {
  type CreatorTopStats,
  type CreatorPlatformStats,
  type CreatorConnectionStats,
} from "@/lib/stats/creator";
import { type PlatformSlug, PLATFORM_ALL, PLATFORM_LABEL } from "@/lib/stats/types";
import type { Range } from "@/lib/stats/range";

type DailyPoint = { date: string; views: number; likes: number; comments: number; shares: number };

interface AllScopeProps {
  kind: "all";
  stats: CreatorTopStats;
  daily: DailyPoint[];
  range: Range;
}
interface PlatformScopeProps {
  kind: "platform";
  platform: PlatformSlug;
  stats: CreatorPlatformStats;
  daily: DailyPoint[];
  range: Range;
}
interface AccountScopeProps {
  kind: "account";
  platform: PlatformSlug;
  stats: CreatorConnectionStats;
  daily: DailyPoint[];
  range: Range;
}

export function OverviewSubTab(props: AllScopeProps | PlatformScopeProps | AccountScopeProps) {
  if (props.kind === "all") return <AllScopeView {...props} />;
  if (props.kind === "platform") return <PlatformScopeView {...props} />;
  return <AccountScopeView {...props} />;
}

function AllScopeView({ stats, daily, range }: AllScopeProps) {
  return (
    <div className="space-y-5">
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
              href={`/creator/connections?platform=${slug}${range.key !== "30d" ? `&range=${range.key}` : ""}`}
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

      <DailyViewsChart data={daily} />
    </div>
  );
}

function PlatformScopeView({ platform, stats, daily, range }: PlatformScopeProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Followers" value={stats.followerCount.toLocaleString()} hint="Latest snapshot" />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} trend={stats.viewsDelta} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} trend={stats.engagementDelta} hint="Likes+comments+shares" />
        <KpiCard
          label="Top post"
          value={stats.topPost ? stats.topPost.views.toLocaleString() : "—"}
          hint={stats.topPost ? truncate(stats.topPost.title, 26) : range.label}
        />
      </div>
      <ConnectionsList platform={platform} connections={stats.connections} rangeKey={range.key} />
      <DailyViewsChart data={daily} />
    </div>
  );
}

function AccountScopeView({ stats, daily, range }: AccountScopeProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Followers"
          value={stats.followerCount?.toLocaleString() ?? "—"}
          hint="Latest snapshot"
        />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} hint="Likes+comments+shares" />
        <KpiCard
          label="Top post"
          value={stats.topPost ? stats.topPost.views.toLocaleString() : "—"}
          hint={stats.topPost ? truncate(stats.topPost.title, 24) : range.label}
        />
      </div>
      <DailyViewsChart data={daily} />
    </div>
  );
}

function ConnectionsList({
  platform,
  connections,
  rangeKey,
}: {
  platform: PlatformSlug;
  connections: { id: string; label: string; followerCount: number | null; lastSyncedAt: Date | null }[];
  rangeKey: string;
}) {
  if (connections.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No {PLATFORM_LABEL[platform]} connections yet.
        </p>
      </div>
    );
  }
  const qs = rangeKey !== "30d" ? `&range=${rangeKey}` : "";
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="px-5 py-3 text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
        Connections
      </p>
      <ul style={{ borderTop: "1px solid var(--border)" }}>
        {connections.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <Link
                href={`/creator/connections?platform=${platform}&account=${c.id}${qs}`}
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--text-primary)" }}
              >
                {c.label}
              </Link>
              {c.lastSyncedAt && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Last synced {new Date(c.lastSyncedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {c.followerCount?.toLocaleString() ?? "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                followers
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
