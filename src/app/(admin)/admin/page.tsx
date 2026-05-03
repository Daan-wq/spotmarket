import Link from "next/link";
import { KpiCard, type KpiCardProps } from "@/components/admin/kpi-card";
import { CreatorScoreCell } from "@/components/admin/creator-score-cell";
import {
  getAgencyOsDashboardSnapshot,
  type OperatingArea,
  type RecentRiskSignal,
} from "@/lib/admin/agency-os";

export const dynamic = "force-dynamic";

const euroFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const SIGNAL_LABEL: Record<RecentRiskSignal["type"], string> = {
  VELOCITY_SPIKE: "Velocity spike",
  VELOCITY_DROP: "Velocity drop",
  RATIO_ANOMALY: "Ratio anomaly",
  BOT_SUSPECTED: "Bot suspected",
  LOGO_MISSING: "Logo missing",
  DUPLICATE: "Duplicate",
  TOKEN_BROKEN: "Token broken",
};

function formatEuro(value: number) {
  return euroFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatPercent(value: number | null) {
  return value == null ? "No reviews" : `${value.toFixed(0)}%`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function OperatingAreaCard({ area }: { area: OperatingArea }) {
  const isLive = area.status === "live";
  const body = (
    <div
      className="h-full rounded-lg p-4 transition-colors"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isLive ? "var(--success-text)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
          {area.name}
        </h3>
        <span
          className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
          style={{
            background: isLive ? "var(--success-bg)" : "var(--bg-primary)",
            color: isLive ? "var(--success-text)" : "var(--text-secondary)",
          }}
        >
          {isLive ? "Live" : "Manual"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {area.detail}
      </p>
    </div>
  );

  if (!area.href) return body;

  return (
    <Link href={area.href} className="block h-full hover:opacity-90 transition-opacity">
      {body}
    </Link>
  );
}

export default async function AdminDashboard() {
  const snapshot = await getAgencyOsDashboardSnapshot();
  const { metrics } = snapshot;

  const metricCards: KpiCardProps[] = [
    {
      label: "Revenue this month",
      value: formatEuro(metrics.totalRevenueThisMonth),
      hint: "booked campaign budget",
      tone: metrics.totalRevenueThisMonth > 0 ? "success" : "default",
      href: "/admin/campaigns",
    },
    {
      label: "Expected next month",
      value: formatEuro(metrics.expectedRevenueNextMonth),
      hint: "campaigns due next month",
      href: "/admin/campaigns",
    },
    {
      label: "Active brands",
      value: metrics.activeBrands,
      hint: "active campaigns as brand proxy",
      href: "/admin/campaigns",
    },
    {
      label: "Brand pipeline",
      value: metrics.pipelineBrands,
      hint: "draft / payment / review",
      tone: metrics.pipelineBrands > 0 ? "success" : "default",
      href: "/admin/campaigns",
    },
    {
      label: "Active clippers",
      value: metrics.activeClippers,
      hint: "verified or active assignment",
      href: "/admin/creators",
    },
    {
      label: "Delivered this week",
      value: metrics.clipsDeliveredThisWeek,
      hint: "new submissions in 7d",
      href: "/admin/submissions",
    },
    {
      label: "Clips approved",
      value: metrics.clipsApprovedThisWeek,
      hint: `${formatPercent(metrics.approvalRate)} approval rate`,
      tone: metrics.approvalRate != null && metrics.approvalRate >= 80 ? "success" : "default",
      href: "/admin/submissions",
    },
    {
      label: "Rejected / revised",
      value: metrics.clipsRejectedOrRevisedThisWeek,
      hint: "rejected or flagged in 7d",
      tone: metrics.clipsRejectedOrRevisedThisWeek > 0 ? "warning" : "default",
      href: "/admin/submissions",
    },
    {
      label: "Needs review",
      value: metrics.clipsNeedsReview,
      hint: "pending submission queue",
      tone: metrics.clipsNeedsReview > 0 ? "warning" : "default",
      href: "/admin/review/videos",
    },
    {
      label: "Payouts owed",
      value: formatEuro(metrics.payoutsOwed),
      hint: "non-confirmed payouts",
      tone: metrics.payoutsOwed > 0 ? "warning" : "success",
      href: "/admin/payouts",
    },
    {
      label: "Est. gross profit",
      value: formatEuro(metrics.estimatedGrossProfit),
      hint: "budget minus creator cost",
      tone: metrics.estimatedGrossProfit >= 0 ? "success" : "danger",
    },
    {
      label: "Open risk signals",
      value: metrics.openRiskSignals,
      hint:
        metrics.criticalRiskSignals > 0
          ? `${metrics.criticalRiskSignals} critical`
          : `${metrics.tokenBrokenSignals} token-broken`,
      tone: metrics.criticalRiskSignals > 0 ? "danger" : metrics.openRiskSignals > 0 ? "warning" : "success",
      href: "/admin/signals",
    },
  ];

  const liveAreaCount = snapshot.operatingAreas.filter((area) => area.status === "live").length;

  return (
    <div className="w-full px-5 py-7 sm:px-8 space-y-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Agency Operating System
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            CEO Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            Daily control for brands, clippers, delivery, payouts, risk, and weekly founder KPIs. Missing agency
            modules stay visible as manual setup areas until the process is ready for software.
          </p>
        </div>
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <span className="block text-[11px] font-semibold uppercase" style={{ color: "var(--text-secondary)" }}>
            OS Coverage
          </span>
          <span className="text-2xl font-semibold">{liveAreaCount}/12</span>
          <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            live modules
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Operating Areas
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              The 12 agency OS tabs mapped onto the current app state.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {snapshot.operatingAreas.map((area) => (
            <OperatingAreaCard key={area.name} area={area} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Delivery Control
              </h2>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Active campaigns nearing deadline or missing goal pace.
              </p>
            </div>
            <Link href="/admin/campaigns" className="text-xs underline" style={{ color: "var(--primary, var(--accent))" }}>
              View all
            </Link>
          </div>
          {snapshot.deliveryRisks.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No delivery risks right now.
            </p>
          ) : (
            <ul>
              {snapshot.deliveryRisks.map((campaign) => (
                <li
                  key={campaign.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="block truncate text-sm font-medium underline-offset-2 hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Due {formatDate(campaign.deadline)} -{" "}
                      {campaign.goal > 0
                        ? `${formatNumber(campaign.captured)} / ${formatNumber(campaign.goal)} views`
                        : `${formatNumber(campaign.captured)} views, no goal set`}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                  >
                    {campaign.goal > 0 ? `${Math.round((1 - campaign.pct) * 100)}% gap` : "No goal"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Clipper Performance
              </h2>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Highest current performance scores.
              </p>
            </div>
            <Link href="/admin/creators" className="text-xs underline" style={{ color: "var(--primary, var(--accent))" }}>
              View all
            </Link>
          </div>
          {snapshot.topClippers.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No performance scores computed yet.
            </p>
          ) : (
            <ul>
              {snapshot.topClippers.map((clipper) => (
                <li
                  key={clipper.profileId ?? clipper.displayName}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    {clipper.profileId ? (
                      <Link
                        href={`/admin/creators/${clipper.profileId}`}
                        className="block truncate text-sm font-medium underline-offset-2 hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {clipper.displayName}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {clipper.displayName}
                      </p>
                    )}
                    <p className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {clipper.email ?? "No email"}
                    </p>
                  </div>
                  <CreatorScoreCell score={clipper.score} sampleSize={clipper.sampleSize} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Quality / Risk Control
              </h2>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Open WARN and CRITICAL signals.
              </p>
            </div>
            <Link href="/admin/signals" className="text-xs underline" style={{ color: "var(--primary, var(--accent))" }}>
              View all
            </Link>
          </div>
          {snapshot.recentRiskSignals.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No open risk signals.
            </p>
          ) : (
            <ul>
              {snapshot.recentRiskSignals.map((signal) => {
                const critical = signal.severity === "CRITICAL";
                return (
                  <li key={signal.id} className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/signals?type=${signal.type}`}
                          className="block truncate text-sm font-medium underline-offset-2 hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {SIGNAL_LABEL[signal.type]}
                        </Link>
                        <p className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {signal.campaignName ?? "Unknown campaign"} - {signal.creatorEmail ?? "Unknown creator"}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{
                          background: critical ? "var(--error-bg)" : "var(--warning-bg)",
                          color: critical ? "var(--error-text)" : "var(--warning-text)",
                        }}
                      >
                        {signal.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
                      Opened {formatDate(signal.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
