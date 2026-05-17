import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { KpiCard } from "@/components/admin/kpi-card";
import { DailyViewsChart } from "@/components/stats/DailyViewsChart";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatNumber, formatShortDate } from "@/lib/i18n-format";
import {
  type CreatorTopStats,
  type CreatorPlatformStats,
  type CreatorConnectionStats,
} from "@/lib/stats/creator";
import { type PlatformSlug, PLATFORM_LABEL } from "@/lib/stats/types";
import { DashboardPlatformGlyph } from "@/lib/stats/platform-icons";
import type { Range } from "@/lib/stats/range";

type DailyPoint = { date: string; views: number; likes: number; comments: number; shares: number };
type ServerT = Awaited<ReturnType<typeof getTranslations>>;

type ViewContext = {
  locale: Locale;
  t: ServerT;
  sharedT: ServerT;
};

type ConnectionRow = {
  id: string;
  label: string;
  followerCount: number | null;
  lastSyncedAt: string | null;
  platform: PlatformSlug;
};

interface AllScopeProps {
  kind: "all";
  stats: CreatorTopStats;
  daily: DailyPoint[];
  range: Range;
  connections: ConnectionRow[];
  basePath?: string;
}
interface PlatformScopeProps {
  kind: "platform";
  platform: PlatformSlug;
  stats: CreatorPlatformStats;
  daily: DailyPoint[];
  range: Range;
  basePath?: string;
}
interface AccountScopeProps {
  kind: "account";
  platform: PlatformSlug;
  stats: CreatorConnectionStats;
  daily: DailyPoint[];
  range: Range;
}

export async function OverviewSubTab(props: AllScopeProps | PlatformScopeProps | AccountScopeProps) {
  const context: ViewContext = {
    locale: (await getLocale()) as Locale,
    t: await getTranslations("creator.connections.overview"),
    sharedT: await getTranslations("creator.shared"),
  };

  if (props.kind === "all") return <AllScopeView {...props} {...context} />;
  if (props.kind === "platform") return <PlatformScopeView {...props} {...context} />;
  return <AccountScopeView {...props} {...context} />;
}

function AllScopeView({
  stats,
  daily,
  range,
  connections,
  basePath,
  locale,
  t,
  sharedT,
}: AllScopeProps & ViewContext) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label={t("totalViews")}
          value={formatNumber(stats.totalViews.value, locale)}
          trend={stats.totalViews.delta}
          hint={range.label}
        />
        <KpiCard
          label={t("totalFollowers")}
          value={formatNumber(stats.totalFollowers.value, locale)}
          hint={sharedT("labels.latestSnapshot")}
        />
        <KpiCard
          label={t("engagement")}
          value={formatNumber(stats.totalEngagement.value, locale)}
          trend={stats.totalEngagement.delta}
          hint={sharedT("labels.likesCommentsShares")}
        />
        <KpiCard
          label={t("earnings")}
          value={formatCurrency(stats.totalEarnings.value, locale)}
          trend={stats.totalEarnings.delta}
          hint={range.label}
        />
      </div>

      <ConnectionsList
        connections={connections}
        rangeKey={range.key}
        showPlatformTag
        basePath={basePath}
        locale={locale}
        t={t}
        sharedT={sharedT}
      />

      <DailyViewsChart data={daily} />
    </div>
  );
}

function PlatformScopeView({
  platform,
  stats,
  daily,
  range,
  basePath,
  locale,
  t,
  sharedT,
}: PlatformScopeProps & ViewContext) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label={t("followers")} value={formatNumber(stats.followerCount, locale)} hint={sharedT("labels.latestSnapshot")} />
        <KpiCard label={t("views")} value={formatNumber(stats.windowViews, locale)} trend={stats.viewsDelta} hint={range.label} />
        <KpiCard label={t("engagement")} value={formatNumber(stats.windowEngagement, locale)} trend={stats.engagementDelta} hint={sharedT("labels.likesCommentsShares")} />
        <KpiCard
          label={t("topPost")}
          value={stats.topPost ? formatNumber(stats.topPost.views, locale) : sharedT("emptyValue")}
          hint={stats.topPost ? truncate(stats.topPost.title, 26) : range.label}
        />
      </div>
      <ConnectionsList
        connections={stats.connections.map((c) => ({
          id: c.id,
          label: c.label,
          followerCount: c.followerCount,
          lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
          platform,
        }))}
        rangeKey={range.key}
        basePath={basePath}
        locale={locale}
        t={t}
        sharedT={sharedT}
      />
      <DailyViewsChart data={daily} />
    </div>
  );
}

function AccountScopeView({
  stats,
  daily,
  range,
  locale,
  t,
  sharedT,
}: AccountScopeProps & ViewContext) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label={t("followers")}
          value={stats.followerCount != null ? formatNumber(stats.followerCount, locale) : sharedT("emptyValue")}
          hint={sharedT("labels.latestSnapshot")}
        />
        <KpiCard label={t("views")} value={formatNumber(stats.windowViews, locale)} hint={range.label} />
        <KpiCard label={t("engagement")} value={formatNumber(stats.windowEngagement, locale)} hint={sharedT("labels.likesCommentsShares")} />
        <KpiCard
          label={t("topPost")}
          value={stats.topPost ? formatNumber(stats.topPost.views, locale) : sharedT("emptyValue")}
          hint={stats.topPost ? truncate(stats.topPost.title, 24) : range.label}
        />
      </div>
      <DailyViewsChart data={daily} />
    </div>
  );
}

function ConnectionsList({
  connections,
  rangeKey,
  showPlatformTag = false,
  basePath = "/creator/connections",
  locale,
  t,
  sharedT,
}: {
  connections: ConnectionRow[];
  rangeKey: string;
  showPlatformTag?: boolean;
  basePath?: string;
  locale: Locale;
  t: ServerT;
  sharedT: ServerT;
}) {
  if (connections.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("noConnections")}
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
        {t("connections")}
      </p>
      <ul style={{ borderTop: "1px solid var(--border)" }}>
        {connections.map((c) => (
          <li
            key={`${c.platform}:${c.id}`}
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`${basePath}?platform=${c.platform}&account=${c.id}${qs}`}
                  className="text-sm font-medium hover:underline truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {c.label}
                </Link>
                {showPlatformTag && (
                  <span
                    aria-label={PLATFORM_LABEL[c.platform]}
                    className="inline-flex shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <DashboardPlatformGlyph platform={c.platform} size={14} />
                  </span>
                )}
              </div>
              {c.lastSyncedAt && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {sharedT("labels.lastSynced", { date: formatShortDate(c.lastSyncedAt, locale) })}
                </p>
              )}
            </div>
            <div className="text-right shrink-0 pl-3">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {c.followerCount != null ? formatNumber(c.followerCount, locale) : sharedT("emptyValue")}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {c.platform === "yt" ? sharedT("units.subscribers") : sharedT("units.followers")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1)}...`;
}
