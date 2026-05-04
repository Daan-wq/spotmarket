import { prisma } from "@/lib/prisma";

export default async function PayoutsPage() {
  const payouts = await prisma.payout.findMany({
    include: { creatorProfile: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Payouts</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Monitor payout history</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{p.creatorProfile?.displayName || "-"}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>${(p.amount?.toNumber?.() ?? 0).toFixed(2)}</td>
                <td className="px-6 py-3 text-sm"><span className="px-2 py-1 rounded text-xs" style={{ background: p.status === "sent" ? "var(--success-bg)" : p.status === "pending" ? "var(--warning-bg)" : "var(--error-bg)", color: p.status === "sent" ? "var(--success-text)" : p.status === "pending" ? "var(--warning-text)" : "var(--error-text)" }}>{p.status}</span></td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{p.paymentMethod || "-"}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{p.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
