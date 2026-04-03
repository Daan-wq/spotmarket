import { getAgencyMetrics } from "@/lib/agency-metrics";
import { NICHE_CONFIG } from "@/lib/niches";

function KpiCard({
  label,
  value,
  unit,
  benchmarkLabel,
  status,
  detail,
}: {
  label: string;
  value: number | string;
  unit?: string;
  benchmarkLabel?: string;
  status: "green" | "orange" | "red" | "neutral";
  detail?: string;
}) {
  const statusColors = {
    green:   { bg: "var(--success-bg)", border: "var(--success)", value: "var(--success)" },
    orange:  { bg: "var(--warning-bg)", border: "var(--warning-text)", value: "var(--warning-text)" },
    red:     { bg: "var(--error-bg)", border: "var(--error-text)", value: "var(--error-text)" },
    neutral: { bg: "var(--bg-primary)", border: "var(--border)", value: "var(--card-foreground)" },
  };
  const colors = statusColors[status];

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: colors.value }}>
        {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        {unit && <span className="text-lg font-normal ml-1">{unit}</span>}
      </p>
      {benchmarkLabel && (
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          doel: {benchmarkLabel}
        </p>
      )}
      {detail && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{detail}</p>
      )}
    </div>
  );
}

function statusForRate(value: number, target: number): "green" | "orange" | "red" {
  if (value >= target) return "green";
  if (value >= target * 0.7) return "orange";
  return "red";
}

export default async function AgencyKPIsPage() {
  const m = await getAgencyMetrics();

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Agency KPIs</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Benchmarks gebaseerd op research — faceless page talent agency
        </p>
      </div>

      {/* Primary KPIs */}
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        Primaire Metrics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Talent Utilization"
          value={m.talentUtilizationRate}
          unit="%"
          benchmarkLabel="≥ 70%"
          status={statusForRate(m.talentUtilizationRate, 70)}
          detail={`${m.pagesWithActiveDeal} / ${m.totalPages} pages met actieve deal`}
        />
        <KpiCard
          label="Booking Ratio"
          value={m.bookingToSubmissionRatio}
          unit="%"
          benchmarkLabel="3–7%"
          status={
            m.bookingToSubmissionRatio >= 3 && m.bookingToSubmissionRatio <= 15
              ? "green"
              : m.bookingToSubmissionRatio < 3 && m.dealsPitched > 0
              ? "orange"
              : "neutral"
          }
          detail={`${m.dealsCompleted} completed van ${m.dealsPitched} gepitched`}
        />
        <KpiCard
          label="Avg Deal Size"
          value={m.avgDealSize > 0 ? `€${m.avgDealSize.toFixed(0)}` : "—"}
          benchmarkLabel="€2.5K–€10K"
          status={
            m.avgDealSize >= 2500 ? "green" : m.avgDealSize >= 1000 ? "orange" : m.avgDealSize === 0 ? "neutral" : "red"
          }
          detail={`${m.dealsCompleted} completed deals`}
        />
        <KpiCard
          label="Agency Revenue"
          value={`€${m.totalAgencyRevenue.toFixed(0)}`}
          benchmarkLabel="€400K+/jaar"
          status={
            m.totalAgencyRevenue >= 400000 ? "green"
            : m.totalAgencyRevenue >= 100000 ? "orange"
            : "neutral"
          }
          detail="Gecumuleerd uit completed deals (18%)"
        />
      </div>

      {/* Operations KPIs */}
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        Operationele Metrics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Content Backlog"
          value={m.avgContentBacklogDays}
          unit=" dagen"
          benchmarkLabel="30–60 dagen"
          status={
            m.avgContentBacklogDays >= 30 ? "green"
            : m.avgContentBacklogDays >= 14 ? "orange"
            : m.totalPages === 0 ? "neutral"
            : "red"
          }
          detail={`${m.pagesWithLowBacklog} pages < 14 dagen (urgent)`}
        />
        <KpiCard
          label="Operator Replaceability"
          value={m.operatorReplaceabilityScore}
          unit="%"
          benchmarkLabel="100%"
          status={
            m.operatorReplaceabilityScore >= 80 ? "green"
            : m.operatorReplaceabilityScore >= 50 ? "orange"
            : m.totalPages === 0 ? "neutral"
            : "red"
          }
          detail="% pages met backup operator klaar"
        />
        <KpiCard
          label="Contract Coverage"
          value={m.signedContractRate}
          unit="%"
          benchmarkLabel="100%"
          status={
            m.signedContractRate >= 90 ? "green"
            : m.signedContractRate >= 70 ? "orange"
            : m.totalPages === 0 ? "neutral"
            : "red"
          }
          detail="% pages met getekend contract"
        />
        <KpiCard
          label="Total Pages"
          value={m.totalPages}
          benchmarkLabel="50+ (jaar 2)"
          status={
            m.totalPages >= 50 ? "green" : m.totalPages >= 20 ? "orange" : "neutral"
          }
          detail={m.tierCounts.map((t) => `Tier ${t.tier}: ${t.count}`).join(" · ")}
        />
      </div>

      {/* Revenue by niche */}
      {m.revenueByNiche.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
            Revenue per Niche
          </h2>
          <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
            <div>
              {m.revenueByNiche
                .sort((a, b) => b.revenue - a.revenue)
                .map((row) => {
                  const cfg = NICHE_CONFIG[row.niche];
                  const maxRevenue = Math.max(...m.revenueByNiche.map((r) => r.revenue));
                  const pct = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={row.niche} className="px-5 py-4 flex items-center gap-4" style={{ background: "var(--bg-elevated)" }}>
                      <div className="w-36 flex-shrink-0">
                        <p className="text-sm font-medium" style={{ color: "var(--card-foreground)" }}>{cfg.label}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.count} deal{row.count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex-1">
                        <div className="w-full rounded-full h-2" style={{ background: "var(--muted)" }}>
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, background: "var(--text-primary)" }}
                          />
                        </div>
                      </div>
                      <p className="text-sm font-semibold w-20 text-right" style={{ color: "var(--text-primary)" }}>
                        €{row.revenue.toFixed(0)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {m.totalPages === 0 && m.totalDeals === 0 && (
        <div
          className="rounded-xl px-8 py-12 text-center"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <p className="text-lg font-medium mb-2" style={{ color: "var(--card-foreground)" }}>
            Nog geen data beschikbaar
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            KPIs worden automatisch berekend zodra er pages en deals in het systeem zijn.
          </p>
        </div>
      )}
    </div>
  );
}
