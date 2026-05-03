"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
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
      // The section falls back to its loading or empty state.
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw(e: FormEvent) {
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
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }

  const canWithdraw = balance >= MIN_WITHDRAW;

  return (
    <div className="space-y-5">
      {error ? <AlertBanner tone="error" title={error} /> : null}
      {success ? <AlertBanner tone="success" title={success} /> : null}

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <h2 className="text-base font-semibold text-neutral-950">
          Withdrawal method
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          Payments go out as USDT on the TRON network. Add the destination only when you request a withdrawal.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant="active">USDT TRC-20</Badge>
          <span className="text-xs text-neutral-500">
            Minimum withdrawal ${MIN_WITHDRAW}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Available to withdraw
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-normal text-neutral-950">
              ${balance.toFixed(2)}
            </p>
          </div>
          {canWithdraw ? (
            <Button className="h-11 rounded-xl px-5" onClick={() => setShowWithdraw((value) => !value)}>
              {showWithdraw ? "Cancel" : "Request withdrawal"}
            </Button>
          ) : (
            <span className="text-sm text-neutral-500">
              ${(MIN_WITHDRAW - balance).toFixed(2)} more to unlock withdrawal
            </span>
          )}
        </div>

        {showWithdraw ? (
          <form onSubmit={handleWithdraw} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-950">
                USDT wallet address (TRC-20)
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="T..."
                required
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
              />
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              We will send your full balance: <strong>${balance.toFixed(2)}</strong>.
            </div>
            <Button
              type="submit"
              isPending={submitting}
              disabled={!walletAddress}
              className="h-11 rounded-xl px-5"
            >
              Confirm withdrawal
            </Button>
          </form>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-950">
            Recent withdrawals
          </h2>
        </div>
        {withdrawals.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No withdrawals yet"
              description="Withdrawals you request will show up here once they are submitted."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Date</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2 text-left text-[11px] font-medium uppercase tracking-wide">TX hash</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 text-neutral-950">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 font-medium text-neutral-950">
                      ${withdrawal.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={withdrawalBadge(withdrawal.status)}>{withdrawal.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {withdrawal.txHash ? (
                        <a
                          href={`https://tronscan.org/#/transaction/${withdrawal.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-neutral-950"
                        >
                          {withdrawal.txHash.slice(0, 12)}...
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
