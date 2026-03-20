import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminFinancesPage() {
  const [payments, networks, campaigns] = await Promise.all([
    prisma.opsPayment.findMany({
      include: {
        client: { select: { name: true } },
        page: { select: { handle: true } },
        internalCampaign: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentNetwork.findMany({ orderBy: { platform: "asc" } }),
    prisma.internalCampaign.findMany({
      where: { status: { in: ["live", "completed"] } },
      select: { clientPays: true, totalPageCost: true },
    }),
  ]);

  const totalIn = payments
    .filter((p) => p.direction === "in" && (p.status === "confirmed" || p.status === "sent"))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalOut = payments
    .filter((p) => p.direction === "out" && (p.status === "confirmed" || p.status === "sent"))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalMargin = campaigns.reduce(
    (sum, c) => sum + (Number(c.clientPays) - Number(c.totalPageCost)),
    0
  );

  const pendingIn = payments
    .filter((p) => p.direction === "in" && p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const statusStyle: Record<string, { bg: string; color: string }> = {
    pending:   { bg: "#fef9c3", color: "#854d0e" },
    sent:      { bg: "#eff6ff", color: "#1d4ed8" },
    confirmed: { bg: "#f0fdf4", color: "#15803d" },
    failed:    { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Finances</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Revenue, costs & margins</p>
        </div>
        <Link
          href="/admin/finances/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: "#4f46e5" }}
        >
          + Log Payment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#16a34a" }}>${totalIn.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Total Received</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#dc2626" }}>${totalOut.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Total Paid Out</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: totalMargin >= 0 ? "#4f46e5" : "#dc2626" }}>
            ${totalMargin.toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Campaign Margin</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#f59e0b" }}>${pendingIn.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Pending Inbound</p>
        </div>
      </div>

      {/* Network balances */}
      {networks.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid #e2e8f0" }}>
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}
          >
            <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Payment Networks</p>
          </div>
          <div className="grid grid-cols-2 gap-px" style={{ background: "#e2e8f0" }}>
            {networks.map((n) => (
              <div key={n.id} className="px-5 py-4" style={{ background: "#ffffff" }}>
                <p className="text-xs font-medium" style={{ color: "#94a3b8" }}>{n.platform.toUpperCase()}</p>
                <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{n.accountLabel}</p>
                <p className="text-xl font-semibold mt-1" style={{ color: "#0f172a" }}>
                  {n.currency} {Number(n.balance).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div
          className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-2.5"
          style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
        >
          {["Dir", "Description", "Amount", "Status", "Date"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              {h}
            </p>
          ))}
        </div>

        {payments.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No payments logged yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {payments.map((p, i) => {
              const ss = statusStyle[p.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              const desc = p.internalCampaign?.name ?? p.client?.name ?? p.page?.handle ?? p.notes ?? "—";
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={p.direction === "in"
                      ? { background: "#f0fdf4", color: "#16a34a" }
                      : { background: "#fef2f2", color: "#dc2626" }
                    }
                  >
                    {p.direction === "in" ? "IN" : "OUT"}
                  </span>
                  <p className="text-sm truncate" style={{ color: "#0f172a" }}>{desc}</p>
                  <p
                    className="text-sm font-medium whitespace-nowrap"
                    style={{ color: p.direction === "in" ? "#16a34a" : "#dc2626" }}
                  >
                    {p.direction === "in" ? "+" : "-"}${Number(p.amount).toFixed(2)}
                  </p>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ background: ss.bg, color: ss.color }}
                  >
                    {p.status}
                  </span>
                  <p className="text-xs whitespace-nowrap" style={{ color: "#94a3b8" }}>
                    {new Date(p.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
