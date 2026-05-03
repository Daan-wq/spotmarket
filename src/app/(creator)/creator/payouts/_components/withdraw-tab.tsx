"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  txHash: string | null;
  createdAt: string;
}

const MIN_WITHDRAW = 50;

export function WithdrawTab() {
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    } catch {
      // ignored — UI shows loading state until first response
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
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
    } catch {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p style={{ color: "var(--text-secondary)" }} className="text-sm">
        Loading…
      </p>
    );
  }

  const canWithdraw = balance >= MIN_WITHDRAW;

  return (
    <div className="space-y-5">
      {error && <AlertBanner tone="error" title={error} />}
      {success && <AlertBanner tone="success" title={success} />}

      {/* Payment method card */}
      <section
        className="rounded-xl border p-5"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Payment method
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Payments go out as USDT on the TRON network (TRC-20). You enter the
          destination wallet at withdrawal time.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="active">USDT · TRC-20</Badge>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Minimum withdrawal ${MIN_WITHDRAW}
          </span>
        </div>
      </section>

      {/* Withdraw card */}
      <section
        className="rounded-xl border p-5"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Available to withdraw
            </p>
            <p
              className="mt-1 text-3xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              ${balance.toFixed(2)}
            </p>
          </div>
          {canWithdraw ? (
            <Button onClick={() => setShowWithdraw((v) => !v)}>
              {showWithdraw ? "Cancel" : "Request withdrawal"}
            </Button>
          ) : (
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              ${(MIN_WITHDRAW - balance).toFixed(2)} more to unlock withdrawal
            </span>
          )}
        </div>

        {showWithdraw && (
          <form onSubmit={handleWithdraw} className="mt-5 space-y-3">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                USDT wallet address (TRC-20)
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="T..."
                required
                className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div
              className="rounded-md px-3 py-2 text-sm"
              style={{ background: "var(--accent-bg)", color: "var(--text-primary)" }}
            >
              We&apos;ll send your full balance:{" "}
              <strong>${balance.toFixed(2)}</strong>.
            </div>
            <Button
              type="submit"
              isPending={submitting}
              disabled={!walletAddress}
            >
              Confirm withdrawal
            </Button>
          </form>
        )}
      </section>

      {/* Withdrawal history */}
      <section
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Recent withdrawals
          </h2>
        </div>
        {withdrawals.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No withdrawals yet"
              description="Withdrawals you request will show up here once they're submitted."
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Date</th>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Amount</th>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">Status</th>
                <th className="text-left text-[11px] uppercase tracking-wide px-5 py-2 font-medium">TX hash</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr
                  key={w.id}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                    {new Date(w.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>
                    ${w.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={withdrawalBadge(w.status)}>{w.status}</Badge>
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                    {w.txHash ? (
                      <a
                        href={`https://tronscan.org/#/transaction/${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                        style={{ color: "var(--accent-foreground)" }}
                      >
                        {w.txHash.slice(0, 12)}…
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function withdrawalBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "sent" || s === "paid") return "paid" as const;
  if (s === "pending" || s === "processing") return "pending" as const;
  if (s === "failed" || s === "rejected") return "failed" as const;
  return "neutral" as const;
}
