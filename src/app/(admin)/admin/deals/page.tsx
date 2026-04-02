import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DealStatus } from "@prisma/client";
import { NicheBadge } from "@/components/admin/NicheSelector";
import { advanceDealStatus } from "./actions";

const COLUMNS: { status: DealStatus; label: string; color: string }[] = [
  { status: "IDENTIFIED",  label: "Identified",   color: "var(--bg-secondary)" },
  { status: "PITCHED",     label: "Pitched",       color: "var(--accent-bg)" },
  { status: "NEGOTIATING", label: "Negotiating",   color: "var(--accent-bg)" },
  { status: "SIGNED",      label: "Signed ✓",      color: "var(--success-bg)" },
  { status: "LIVE",        label: "Live 🟢",        color: "var(--warning-bg)" },
  { status: "COMPLETED",   label: "Completed",     color: "var(--success-bg)" },
  { status: "REJECTED",    label: "Rejected",      color: "var(--error-bg)" },
];

const NEXT_STATUS: Partial<Record<DealStatus, DealStatus>> = {
  IDENTIFIED: "PITCHED",
  PITCHED: "NEGOTIATING",
  NEGOTIATING: "SIGNED",
  SIGNED: "LIVE",
  LIVE: "COMPLETED",
};

export default async function DealsPage() {
  const deals = await prisma.brandDeal.findMany({
    include: {
      pages: { include: { page: { select: { handle: true, followerCount: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byStatus = Object.fromEntries(
    COLUMNS.map((col) => [col.status, deals.filter((d) => d.status === col.status)])
  ) as Record<DealStatus, typeof deals>;

  const totalPipelineValue = deals
    .filter((d) => !["REJECTED", "IDENTIFIED"].includes(d.status) && d.totalValue)
    .reduce((s, d) => s + (d.totalValue ?? 0), 0);
  const totalAgencyRevenue = deals
    .filter((d) => d.status === "COMPLETED" && d.agencyCommission)
    .reduce((s, d) => s + (d.agencyCommission ?? 0), 0);

  return (
    <div className="p-8 max-w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Brand Deal Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {deals.length} deals · Pipeline: €{totalPipelineValue.toFixed(0)} · Agency revenue: €{totalAgencyRevenue.toFixed(0)}
          </p>
        </div>
        <Link
          href="/admin/deals/new"
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--text-primary)" }}
        >
          + Nieuwe deal
        </Link>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const cards = byStatus[col.status] ?? [];
          const colValue = cards.filter((d) => d.totalValue).reduce((s, d) => s + (d.totalValue ?? 0), 0);
          return (
            <div key={col.status} className="flex-shrink-0 w-64">
              <div
                className="rounded-t-lg px-3 py-2 flex items-center justify-between"
                style={{ background: col.color }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--card-foreground)" }}>{col.label}</span>
                <div className="flex items-center gap-2">
                  {colValue > 0 && (
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>€{(colValue / 1000).toFixed(1)}K</span>
                  )}
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.6)', color: "var(--card-foreground)" }}>
                    {cards.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mt-2 min-h-[200px]">
                {cards.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg p-3 shadow-sm"
                    style={{ background: "var(--bg-elevated)", border: '1px solid var(--border)' }}
                  >
                    <Link
                      href={`/admin/deals/${deal.id}`}
                      className="text-sm font-medium hover:underline block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {deal.brandName}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1">
                      <NicheBadge niche={deal.niche} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {deal.dealType.toLowerCase()}
                      </span>
                    </div>
                    {deal.totalValue && (
                      <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                        €{deal.totalValue.toFixed(0)}
                        <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>
                          (18% = €{((deal.totalValue ?? 0) * 0.18).toFixed(0)})
                        </span>
                      </p>
                    )}
                    {deal.proposedCPM && !deal.totalValue && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>€{deal.proposedCPM} CPM</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {deal.pages.length} page{deal.pages.length !== 1 ? "s" : ""}
                      {deal.pages.length > 0 && ` · ${deal.pages.slice(0, 2).map((p) => `@${p.page.handle}`).join(", ")}${deal.pages.length > 2 ? ` +${deal.pages.length - 2}` : ""}`}
                    </p>

                    {/* Advance button */}
                    {NEXT_STATUS[col.status] && (
                      <form action={advanceDealStatus.bind(null, deal.id, NEXT_STATUS[col.status]!)}>
                        <button
                          type="submit"
                          className="mt-2 text-[11px] px-2 py-0.5 rounded border transition-colors"
                          style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
                        >
                          → {NEXT_STATUS[col.status]}
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
