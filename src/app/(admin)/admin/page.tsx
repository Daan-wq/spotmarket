import Link from "next/link";
import { CreatorScoreCell } from "@/components/admin/creator-score-cell";
import { getAgencyOsDashboardSnapshot, type RecentRiskSignal } from "@/lib/admin/agency-os";

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

interface FlowStep {
  step: string;
  title: string;
  purpose: string;
  status: "good" | "attention" | "manual";
  metric: string;
  subMetric: string;
  href: string;
  action: string;
}

interface ActionItem {
  title: string;
  detail: string;
  href: string;
  tone: "attention" | "good";
}

function formatEuro(value: number) {
  return euroFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusStyle(status: FlowStep["status"] | ActionItem["tone"]) {
  if (status === "good") {
    return {
      border: "var(--success-text)",
      badgeBg: "var(--success-bg)",
      badgeText: "var(--success-text)",
      label: "Clear",
    };
  }
  if (status === "manual") {
    return {
      border: "var(--border)",
      badgeBg: "var(--bg-primary)",
      badgeText: "var(--text-secondary)",
      label: "Manual",
    };
  }
  return {
    border: "var(--warning-text)",
    badgeBg: "var(--warning-bg)",
    badgeText: "var(--warning-text)",
    label: "Needs work",
  };
}

function FlowStepCard({ item }: { item: FlowStep }) {
  const style = statusStyle(item.status);

  return (
    <Link
      href={item.href}
      className="block rounded-lg p-4 transition-opacity hover:opacity-90"
      style={{ background: "var(--bg-card)", border: `1px solid ${style.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {item.step}
        </p>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
          style={{ background: style.badgeBg, color: style.badgeText }}
        >
          {style.label}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
        {item.title}
      </h2>
      <p className="mt-1 min-h-10 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
        {item.purpose}
      </p>
      <div className="mt-5">
        <p className="text-3xl font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
          {item.metric}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {item.subMetric}
        </p>
      </div>
      <p className="mt-4 text-xs font-semibold" style={{ color: "var(--primary, var(--accent))" }}>
        {item.action}
      </p>
    </Link>
  );
}

function SummaryPanel({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "attention" | "good";
}) {
  const border =
    tone === "attention" ? "var(--warning-text)" : tone === "good" ? "var(--success-text)" : "var(--border)";

  return (
    <div className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: `1px solid ${border}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
        {detail}
      </p>
    </div>
  );
}

function buildActions(snapshot: Awaited<ReturnType<typeof getAgencyOsDashboardSnapshot>>): ActionItem[] {
  const { metrics } = snapshot;
  const actions: ActionItem[] = [];

  if (metrics.clipsNeedsReview > 0) {
    actions.push({
      title: `Review ${metrics.clipsNeedsReview} pending clips`,
      detail: "This is the current delivery bottleneck. Approve, reject, or mark missing logo before anything else.",
      href: "/admin/review/videos",
      tone: "attention",
    });
  }

  if (snapshot.deliveryRisks.length > 0) {
    const firstRisk = snapshot.deliveryRisks[0];
    actions.push({
      title: `Fix campaign pace: ${firstRisk.name}`,
      detail:
        firstRisk.goal > 0
          ? `${formatNumber(firstRisk.captured)} of ${formatNumber(firstRisk.goal)} views captured.`
          : "This campaign has no view goal set, so delivery health is unclear.",
      href: `/admin/campaigns/${firstRisk.id}`,
      tone: "attention",
    });
  }

  if (metrics.payoutsOwed > 0) {
    actions.push({
      title: `Process ${formatEuro(metrics.payoutsOwed)} in payouts`,
      detail: "Keep creator payments out of chat threads and close the payout loop in admin.",
      href: "/admin/payouts",
      tone: "attention",
    });
  }

  if (metrics.openRiskSignals > 0) {
    actions.push({
      title: `Resolve ${metrics.openRiskSignals} open risk signals`,
      detail:
        metrics.criticalRiskSignals > 0
          ? `${metrics.criticalRiskSignals} critical signals need owner attention.`
          : "Review WARN signals before they become delivery problems.",
      href: "/admin/signals",
      tone: "attention",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "No urgent operations blocked",
      detail: "Use the flow below to plan sales, production capacity, and the next weekly review.",
      href: "/admin/campaigns",
      tone: "good",
    });
  }

  return actions.slice(0, 4);
}

export default async function AdminDashboard() {
  const snapshot = await getAgencyOsDashboardSnapshot();
  const { metrics } = snapshot;

  const flow: FlowStep[] = [
    {
      step: "Step 1",
      title: "Sell brands",
      purpose: "Track closed campaigns and the brand pipeline. CRM work is still manual outside the app.",
      status: metrics.pipelineBrands > 0 || metrics.activeBrands > 0 ? "good" : "attention",
      metric: `${metrics.activeBrands} active`,
      subMetric: `${metrics.pipelineBrands} in pipeline - ${formatEuro(metrics.totalRevenueThisMonth)} booked this month`,
      href: "/admin/campaigns",
      action: "Open campaign pipeline",
    },
    {
      step: "Step 2",
      title: "Staff clippers",
      purpose: "Know whether there are enough active creators to deliver the work you sold.",
      status: metrics.activeClippers > 0 ? "good" : "attention",
      metric: String(metrics.activeClippers),
      subMetric: "verified or assigned clippers",
      href: "/admin/creators",
      action: "Open clipper database",
    },
    {
      step: "Step 3",
      title: "Produce clips",
      purpose: "Follow production volume from submission to campaign delivery.",
      status: snapshot.deliveryRisks.length > 0 ? "attention" : "good",
      metric: String(metrics.clipsDeliveredThisWeek),
      subMetric: `${snapshot.deliveryRisks.length} campaigns at risk`,
      href: "/admin/submissions",
      action: "Open production tracker",
    },
    {
      step: "Step 4",
      title: "Quality control",
      purpose: "Clear pending reviews, logo checks, rejected clips, and delivery risk signals.",
      status: metrics.clipsNeedsReview > 0 || metrics.openRiskSignals > 0 ? "attention" : "good",
      metric: String(metrics.clipsNeedsReview),
      subMetric: `${metrics.clipsApprovedThisWeek} approved - ${metrics.clipsRejectedOrRevisedThisWeek} rejected or flagged`,
      href: "/admin/review/videos",
      action: "Open review queue",
    },
    {
      step: "Step 5",
      title: "Pay and review",
      purpose: "Close the money loop and use the weekly KPI rhythm to decide what to fix next.",
      status: metrics.payoutsOwed > 0 ? "attention" : "good",
      metric: formatEuro(metrics.payoutsOwed),
      subMetric: `${formatEuro(metrics.estimatedGrossProfit)} estimated gross profit`,
      href: "/admin/payouts",
      action: "Open payouts",
    },
  ];

  const actions = buildActions(snapshot);
  const primaryAction = actions[0];

  return (
    <div className="w-full px-5 py-7 sm:px-8">
      <header className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Agency Operating System
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Admin dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            One flow: sell brands, staff clippers, produce clips, check quality, then pay and review. Start with the
            bottleneck, not the menu.
          </p>
        </div>
        <Link
          href={primaryAction.href}
          className="rounded-lg p-4 transition-opacity hover:opacity-90"
          style={{
            background: primaryAction.tone === "attention" ? "var(--warning-bg)" : "var(--success-bg)",
            border: `1px solid ${primaryAction.tone === "attention" ? "var(--warning-text)" : "var(--success-text)"}`,
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: primaryAction.tone === "attention" ? "var(--warning-text)" : "var(--success-text)" }}
          >
            Start here
          </p>
          <h2 className="mt-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {primaryAction.title}
          </h2>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
            {primaryAction.detail}
          </p>
        </Link>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryPanel
          label="Money"
          value={formatEuro(metrics.estimatedGrossProfit)}
          detail={`${formatEuro(metrics.bookedCampaignBudget)} booked budget minus creator cost and open payouts.`}
          tone={metrics.estimatedGrossProfit >= 0 ? "good" : "attention"}
        />
        <SummaryPanel
          label="Delivery"
          value={`${metrics.clipsNeedsReview} to review`}
          detail={`${metrics.clipsDeliveredThisWeek} clips submitted this week, ${snapshot.deliveryRisks.length} campaigns need pace checks.`}
          tone={metrics.clipsNeedsReview > 0 || snapshot.deliveryRisks.length > 0 ? "attention" : "good"}
        />
        <SummaryPanel
          label="Risk"
          value={`${metrics.openRiskSignals} open`}
          detail={
            metrics.criticalRiskSignals > 0
              ? `${metrics.criticalRiskSignals} critical signals.`
              : `${metrics.tokenBrokenSignals} token issues.`
          }
          tone={metrics.openRiskSignals > 0 ? "attention" : "good"}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Agency flow
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Each block is one part of the operating system. Follow it left to right.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {flow.map((item) => (
            <FlowStepCard key={item.step} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Next actions
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              The dashboard should tell you what to do first. This list is sorted by operational urgency.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {actions.map((action) => {
              const style = statusStyle(action.tone);
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:opacity-90"
                >
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {action.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                      {action.detail}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ background: style.badgeBg, color: style.badgeText }}
                  >
                    {style.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Best clipper right now
              </h2>
            </div>
            {snapshot.topClippers[0] ? (
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={snapshot.topClippers[0].profileId ? `/admin/creators/${snapshot.topClippers[0].profileId}` : "/admin/creators"}
                      className="block truncate text-sm font-semibold underline-offset-2 hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {snapshot.topClippers[0].displayName}
                    </Link>
                    <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                      {snapshot.topClippers[0].email ?? "No email"}
                    </p>
                  </div>
                  <CreatorScoreCell
                    score={snapshot.topClippers[0].score}
                    sampleSize={snapshot.topClippers[0].sampleSize}
                  />
                </div>
              </div>
            ) : (
              <p className="px-5 py-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                No performance scores yet.
              </p>
            )}
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Latest risk
              </h2>
            </div>
            {snapshot.recentRiskSignals[0] ? (
              <Link href={`/admin/signals?type=${snapshot.recentRiskSignals[0].type}`} className="block px-5 py-4">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {SIGNAL_LABEL[snapshot.recentRiskSignals[0].type]}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
                  {snapshot.recentRiskSignals[0].campaignName ?? "Unknown campaign"} -{" "}
                  {snapshot.recentRiskSignals[0].creatorEmail ?? "Unknown creator"} - opened{" "}
                  {formatDate(snapshot.recentRiskSignals[0].createdAt)}
                </p>
              </Link>
            ) : (
              <p className="px-5 py-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                No open risk signals.
              </p>
            )}
          </div>

          <div
            className="rounded-lg px-5 py-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Still manual
            </h2>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
              Brand CRM, onboarding, recruitment, pricing, contracts, and SOPs are not real software modules yet. They
              should stay in the manual sheet until the process is stable.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
