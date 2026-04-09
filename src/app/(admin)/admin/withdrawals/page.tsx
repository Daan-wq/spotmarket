import { prisma } from "@/lib/prisma";
import WithdrawalActions from "./_components/withdrawal-actions";

export default async function WithdrawalsPage() {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    include: {
      wallet: {
        include: {
          user: {
            select: {
              email: true,
              creatorProfile: { select: { displayName: true, tronsAddress: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Withdrawals</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Process creator withdrawal requests (USDT TRC-20)</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Wallet Address</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Requested</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No withdrawal requests yet
                </td>
              </tr>
            )}
            {withdrawals.map((w) => (
              <tr key={w.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                  <div>{w.wallet.user.creatorProfile?.displayName || w.wallet.user.email}</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{w.wallet.user.email}</div>
                </td>
                <td className="px-6 py-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  ${Number(w.amount).toFixed(2)}
                </td>
                <td className="px-6 py-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  <span title={w.walletAddress}>{w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-6)}</span>
                </td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {new Date(w.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className="px-2 py-1 rounded text-xs" style={{
                    background:
                      w.status === "CONFIRMED" || w.status === "SENT" ? "var(--success-bg)" :
                      w.status === "PENDING" || w.status === "PROCESSING" ? "var(--warning-bg)" :
                      "var(--error-bg)",
                    color:
                      w.status === "CONFIRMED" || w.status === "SENT" ? "var(--success-text)" :
                      w.status === "PENDING" || w.status === "PROCESSING" ? "var(--warning-text)" :
                      "var(--error-text)",
                  }}>
                    {w.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <WithdrawalActions
                    id={w.id}
                    status={w.status}
                    walletAddress={w.walletAddress}
                    txHash={w.txHash}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
