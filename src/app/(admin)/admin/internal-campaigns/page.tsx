import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusStyle: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "#f3f4f6", color: "#6b7280" },
  confirmed: { bg: "#eff6ff", color: "#1d4ed8" },
  scheduled: { bg: "#f5f3ff", color: "#7c3aed" },
  live:      { bg: "#f0fdf4", color: "#15803d" },
  completed: { bg: "#f0fdf4", color: "#15803d" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c" },
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
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Internal Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{campaigns.length} total campaigns</p>
        </div>
        <Link
          href="/admin/internal-campaigns/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: "#4f46e5" }}
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
            <div key={status} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
                  {status}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: s.bg, color: s.color }}
                >
                  {cols.length}
                </span>
              </div>
              <div style={{ background: "#ffffff" }}>
                {cols.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "#cbd5e1" }}>No campaigns</p>
                ) : (
                  cols.map((c, i) => {
                    const margin = Number(c.clientPays) - Number(c.totalPageCost);
                    return (
                      <Link
                        key={c.id}
                        href={`/admin/internal-campaigns/${c.id}`}
                        className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                        style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                      >
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{c.client.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs" style={{ color: "#64748b" }}>
                            ${Number(c.clientPays).toFixed(0)} · margin ${margin.toFixed(0)}
                          </p>
                          <p className="text-xs" style={{ color: "#94a3b8" }}>{c._count.campaignPages} pages</p>
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
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div
          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5"
          style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
        >
          {["Campaign", "Client", "Client Pays", "Cost", "Margin", "Status"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              {h}
            </p>
          ))}
        </div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No campaigns yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {campaigns.map((c, i) => {
              const margin = Number(c.clientPays) - Number(c.totalPageCost);
              const s = statusStyle[c.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <Link
                  key={c.id}
                  href={`/admin/internal-campaigns/${c.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>{c.client.name}</p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "#0f172a" }}>${Number(c.clientPays).toFixed(2)}</p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>${Number(c.totalPageCost).toFixed(2)}</p>
                  <p
                    className="text-sm whitespace-nowrap font-medium"
                    style={{ color: margin >= 0 ? "#16a34a" : "#dc2626" }}
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
