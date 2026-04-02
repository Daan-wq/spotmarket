import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusStyle: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
  confirmed: { bg: "var(--accent-bg)", color: "var(--accent)" },
  scheduled: { bg: "var(--accent-bg)", color: "var(--accent)" },
  live:      { bg: "var(--success-bg)", color: "var(--success)" },
  completed: { bg: "var(--success-bg)", color: "var(--success)" },
  cancelled: { bg: "var(--error-bg)", color: "var(--error-text)" },
};

export default async function AdminInternalCampaignsPage() {
  const campaigns = await prisma.internalCampaign.findMany({
    include: {
      client: { select: { name: true } },
      campaignPages: { select: { id: true, status: true } },
      _count: { select: { campaignPages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = {
    draft:     campaigns.filter((c) => c.status === "draft"),
    confirmed: campaigns.filter((c) => c.status === "confirmed"),
    scheduled: campaigns.filter((c) => c.status === "scheduled"),
    live:      campaigns.filter((c) => c.status === "live"),
    completed: campaigns.filter((c) => c.status === "completed"),
    cancelled: campaigns.filter((c) => c.status === "cancelled"),
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Internal Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{campaigns.length} total campaigns</p>
        </div>
        <Link
          href="/admin/internal-campaigns/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: "var(--accent)" }}
        >
          + New Campaign
        </Link>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {(["draft", "confirmed", "scheduled", "live"] as const).map((status) => {
          const s = statusStyle[status];
          const cols = grouped[status];
          return (
            <div key={status} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: "var(--bg-primary)", borderBottomColor: 'var(--border)', borderBottomWidth: '1px' }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {status}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: s.bg, color: s.color }}
                >
                  {cols.length}
                </span>
              </div>
              <div style={{ background: "var(--bg-elevated)" }}>
                {cols.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>No campaigns</p>
                ) : (
                  cols.map((c, i) => {
                    const margin = Number(c.clientPays) - Number(c.totalPageCost);
                    return (
                      <Link
                        key={c.id}
                        href={`/admin/internal-campaigns/${c.id}`}
                        className="block px-4 py-3 transition-colors"
                        style={{ borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined }}
                      >
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.client.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            ${Number(c.clientPays).toFixed(0)} · margin ${margin.toFixed(0)}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c._count.campaignPages} pages</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table: all campaigns */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div
          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5"
          style={{ background: "var(--bg-primary)", borderBottomColor: 'var(--border)', borderBottomWidth: '1px' }}
        >
          {["Campaign", "Client", "Client Pays", "Cost", "Margin", "Status"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {h}
            </p>
          ))}
        </div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No campaigns yet.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-elevated)" }}>
            {campaigns.map((c, i) => {
              const margin = Number(c.clientPays) - Number(c.totalPageCost);
              const s = statusStyle[c.status] ?? { bg: "var(--bg-secondary)", color: "var(--text-secondary)" };
              return (
                <Link
                  key={c.id}
                  href={`/admin/internal-campaigns/${c.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 transition-colors"
                  style={{ borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{c.client.name}</p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-primary)" }}>${Number(c.clientPays).toFixed(2)}</p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>${Number(c.totalPageCost).toFixed(2)}</p>
                  <p
                    className="text-sm whitespace-nowrap font-medium"
                    style={{ color: margin >= 0 ? "var(--success)" : "var(--error-text)" }}
                  >
                    ${margin.toFixed(2)}
                  </p>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {c.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
