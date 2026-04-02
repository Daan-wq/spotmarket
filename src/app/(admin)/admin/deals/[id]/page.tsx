import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DealStatus } from "@prisma/client";
import { NicheBadge } from "@/components/admin/NicheSelector";
import { advanceDealStatus } from "../actions";

const STATUS_LABELS: Record<DealStatus, { label: string; color: string; bg: string }> = {
  IDENTIFIED:  { label: "Identified",   color: "var(--text-secondary)", bg: "var(--bg-secondary)" },
  PITCHED:     { label: "Pitched",      color: "var(--accent)", bg: "var(--accent-bg)" },
  NEGOTIATING: { label: "Negotiating",  color: "var(--accent)", bg: "var(--accent-bg)" },
  SIGNED:      { label: "Signed ✓",     color: "var(--success)", bg: "var(--success-bg)" },
  LIVE:        { label: "Live 🟢",       color: "var(--warning-text)", bg: "var(--warning-bg)" },
  COMPLETED:   { label: "Completed",    color: "var(--success)", bg: "var(--success-bg)" },
  REJECTED:    { label: "Rejected",     color: "var(--error-text)", bg: "var(--error-bg)" },
};

const NEXT_STATUS: Partial<Record<DealStatus, DealStatus>> = {
  IDENTIFIED: "PITCHED",
  PITCHED: "NEGOTIATING",
  NEGOTIATING: "SIGNED",
  SIGNED: "LIVE",
  LIVE: "COMPLETED",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await prisma.brandDeal.findUnique({
    where: { id },
    include: {
      pages: {
        include: {
          page: { select: { id: true, handle: true, followerCount: true, niche: true, tierLevel: true } },
        },
      },
    },
  });
  if (!deal) notFound();

  const statusCfg = STATUS_LABELS[deal.status];
  const totalReach = deal.pages.reduce((s, p) => s + p.page.followerCount, 0);
  const nextStatus = NEXT_STATUS[deal.status];

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/deals" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Deal Pipeline
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{deal.brandName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <NicheBadge niche={deal.niche} />
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {deal.dealType.replace("_", " ")}
            </span>
          </div>
        </div>

        {nextStatus && (
          <form action={advanceDealStatus.bind(null, deal.id, nextStatus)}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--text-primary)" }}
            >
              → {STATUS_LABELS[nextStatus].label}
            </button>
          </form>
        )}
      </div>

      {/* Deal economics */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>DEAL WAARDE</p>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {deal.totalValue ? `€${deal.totalValue.toFixed(0)}` : deal.proposedCPM ? `€${deal.proposedCPM} CPM` : "—"}
          </p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>AGENCY (18%)</p>
          <p className="text-2xl font-semibold" style={{ color: "var(--success)" }}>
            {deal.agencyCommission ? `€${deal.agencyCommission.toFixed(0)}` : "—"}
          </p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>COMBINED REACH</p>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {totalReach >= 1_000_000
              ? `${(totalReach / 1_000_000).toFixed(1)}M`
              : totalReach >= 1000
              ? `${(totalReach / 1000).toFixed(0)}K`
              : totalReach}
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Contact</p>
        </div>
        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
          <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>NAAM</p>
            <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{deal.contactName ?? "—"}</p>
          </div>
          <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>EMAIL</p>
            {deal.contactEmail ? (
              <a href={`mailto:${deal.contactEmail}`} className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
                {deal.contactEmail}
              </a>
            ) : (
              <p className="text-sm" style={{ color: "var(--card-foreground)" }}>—</p>
            )}
          </div>
        </div>
      </div>

      {/* Pages in deal */}
      <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Pages in deal ({deal.pages.length})
          </p>
        </div>
        {deal.pages.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Geen pages gekoppeld.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-elevated)" }}>
            {deal.pages.map((dp, i) => (
              <Link
                key={dp.id}
                href={`/admin/ops-pages/${dp.page.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors"
                style={{ borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>@{dp.page.handle}</span>
                  {dp.page.niche && <NicheBadge niche={dp.page.niche} />}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    Tier {dp.page.tierLevel}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {dp.page.followerCount >= 1000
                    ? `${(dp.page.followerCount / 1000).toFixed(0)}K`
                    : dp.page.followerCount}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Timeline</p>
        </div>
        <div style={{ background: "var(--bg-elevated)", borderColor: 'var(--border)' }}>
          {[
            { label: "Aangemaakt", date: deal.createdAt },
            { label: "Gepitched", date: deal.pitchedAt },
            { label: "Reactie ontvangen", date: deal.respondedAt },
            { label: "Getekend", date: deal.signedAt },
            { label: "Afgeleverd", date: deal.deliveredAt },
          ].map((row, i) => (
            <div key={row.label} className="px-5 py-3 flex items-center justify-between" style={{ borderTopColor: 'var(--border)', borderTopWidth: i > 0 ? '1px' : '0' }}>
              <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{row.label}</p>
              <p className="text-sm" style={{ color: row.date ? "var(--card-foreground)" : "var(--text-muted)" }}>
                {row.date ? new Date(row.date).toLocaleDateString("nl-NL") : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {deal.notes && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>NOTITIES</p>
          <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{deal.notes}</p>
        </div>
      )}
    </div>
  );
}
