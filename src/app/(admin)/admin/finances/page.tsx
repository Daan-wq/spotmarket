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
    pending:   { bg: "var(--warning-bg)", color: "var(--warning-text)" },
    sent:      { bg: "var(--accent-bg)", color: "var(--accent)" },
    confirmed: { bg: "var(--success-bg)", color: "var(--success)" },
    failed:    { bg: "var(--error-bg)", color: "var(--error-text)" },
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Finances</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Revenue, costs & margins</p>
        </div>
        <Link
          href="/admin/finances/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: "var(--accent)" }}
        >
          + Log Payment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--success)" }}>${totalIn.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Total Received</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--error-text)" }}>${totalOut.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Total Paid Out</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: totalMargin >= 0 ? "var(--accent)" : "var(--error-text)" }}>
            ${totalMargin.toFixed(2)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Campaign Margin</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--warning-text)" }}>${pendingIn.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Pending Inbound</p>
        </div>
      </div>

      {/* Network balances */}
      {networks.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Payment Networks</p>
          </div>
          <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
            {networks.map((n) => (
              <div key={n.id} className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{n.platform.toUpperCase()}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{n.accountLabel}</p>
                <p className="text-xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                  {n.currency} {Number(n.balance).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div
          className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-2.5"
          style={{ background: "var(--bg-primary)", borderBottomColor: 'var(--border)', borderBottomWidth: '1px' }}
        >
          {["Dir", "Description", "Amount", "Status", "Date"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {h}
            </p>
          ))}
        </div>

        {payments.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No payments logged yet.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-elevated)" }}>
            {payments.map((p, i) => {
              const ss = statusStyle[p.status] ?? { bg: "var(--bg-secondary)", color: "var(--text-secondary)" };
              const desc = p.internalCampaign?.name ?? p.client?.name ?? p.page?.handle ?? p.notes ?? "—";
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                  style={{ borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined }}
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={p.direction === "in"
                      ? { background: "var(--success-bg)", color: "var(--success)" }
                      : { background: "var(--error-bg)", color: "var(--error-text)" }
                    }
                  >
                    {p.direction === "in" ? "IN" : "OUT"}
                  </span>
                  <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{desc}</p>
                  <p
                    className="text-sm font-medium whitespace-nowrap"
                    style={{ color: p.direction === "in" ? "var(--success)" : "var(--error-text)" }}
                  >
                    {p.direction === "in" ? "+" : "-"}${Number(p.amount).toFixed(2)}
                  </p>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ background: ss.bg, color: ss.color }}
                  >
                    {p.status}
                  </span>
                  <p className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
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
