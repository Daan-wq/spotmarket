"use client";

import { useState, useEffect } from "react";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  txHash: string | null;
  createdAt: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setWithdrawals(data.withdrawals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Withdrawal failed");
        return;
      }

      setSuccess(`Withdrawal request submitted for $${data.withdrawal.amount.toFixed(2)}`);
      setShowWithdraw(false);
      setWalletAddress("");
      fetchWallet();
    } catch (err) {
      setError("An error occurred");
    } finally {
      setWithdrawLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--text-secondary)" }}>Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Wallet
      </h1>

      {error && (
        <div className="p-4 rounded-lg mb-4" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg mb-4" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
          {success}
        </div>
      )}

      {/* Balance card */}
      <div
        className="rounded-lg p-6 border mb-6"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Available Balance</p>
        <p className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
          ${balance.toFixed(2)}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
          Campaign earnings are credited to your wallet after a campaign has ended.
        </p>

        <div className="mt-4">
          {balance >= 50 ? (
            <button
              onClick={() => setShowWithdraw(!showWithdraw)}
              className="py-2 px-6 rounded-lg font-medium transition-all"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {showWithdraw ? "Cancel" : "Request Withdrawal"}
            </button>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Minimum $50.00 required to withdraw
            </p>
          )}
        </div>
      </div>

      {/* Withdraw form */}
      {showWithdraw && (
        <div
          className="rounded-lg p-6 border mb-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Withdrawal Request
          </h2>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                USDT Wallet Address (TRC-20)
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="T..."
                required
                className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Payment will be sent as USDT on the TRON (TRC-20) network
              </p>
            </div>
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: "rgba(99, 102, 241, 0.1)", color: "var(--text-secondary)" }}
            >
              Withdrawal amount: <strong style={{ color: "var(--text-primary)" }}>${balance.toFixed(2)}</strong> (full balance)
            </div>
            <button
              type="submit"
              disabled={withdrawLoading || !walletAddress}
              className="py-2 px-6 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {withdrawLoading ? "Submitting..." : "Confirm Withdrawal"}
            </button>
          </form>
        </div>
      )}

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold p-6 pb-3" style={{ color: "var(--text-primary)" }}>
            Withdrawal History
          </h2>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>TX Hash</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    {new Date(w.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    ${w.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background:
                          w.status === "CONFIRMED" || w.status === "SENT" ? "var(--success-bg)" :
                          w.status === "PENDING" || w.status === "PROCESSING" ? "var(--warning-bg)" :
                          "var(--error-bg)",
                        color:
                          w.status === "CONFIRMED" || w.status === "SENT" ? "var(--success-text)" :
                          w.status === "PENDING" || w.status === "PROCESSING" ? "var(--warning-text)" :
                          "var(--error-text)",
                      }}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {w.txHash ? (
                      <a
                        href={`https://tronscan.org/#/transaction/${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {w.txHash.slice(0, 12)}...
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
