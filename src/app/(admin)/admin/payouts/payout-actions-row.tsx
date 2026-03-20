"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayoutStatus, PayoutType } from "@prisma/client";

interface PayoutRow {
  id: string;
  amount: string | number;
  currency: string;
  walletAddress: string;
  type: PayoutType;
  status: PayoutStatus;
  txHash: string | null;
  verifiedViews: number | null;
  createdAt: string;
  application: {
    campaign: { name: string };
    creatorProfile: { displayName: string; walletAddress: string | null };
  };
}

const statusStyle: Record<PayoutStatus, { backgroundColor: string; color: string }> = {
  pending:    { backgroundColor: "#fffbeb", color: "#b45309" },
  processing: { backgroundColor: "#eff6ff", color: "#1d4ed8" },
  sent:       { backgroundColor: "#f5f3ff", color: "#7c3aed" },
  confirmed:  { backgroundColor: "#f0fdf4", color: "#15803d" },
  failed:     { backgroundColor: "#fef2f2", color: "#b91c1c" },
  disputed:   { backgroundColor: "#fff7ed", color: "#c2410c" },
};

export function PayoutActionsRow({
  payout,
  readonly = false,
}: {
  payout: PayoutRow;
  readonly?: boolean;
}) {
  const router = useRouter();
  const [txHash, setTxHash] = useState(payout.txHash ?? "");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyWallet() {
    navigator.clipboard.writeText(payout.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markSent() {
    if (!txHash.trim()) {
      alert("Enter a transaction hash before marking as sent.");
      return;
    }
    setLoading(true);
    await fetch(`/api/payouts/${payout.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent", txHash: txHash.trim() }),
    });
    router.refresh();
    setLoading(false);
  }

  async function markConfirmed() {
    setLoading(true);
    await fetch(`/api/payouts/${payout.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
    router.refresh();
    setLoading(false);
  }

  const colors = statusStyle[payout.status];

  return (
    <div className="px-5 py-5" style={{ borderTop: "1px solid #f8fafc" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium" style={{ color: "#0f172a" }}>
              {payout.application.creatorProfile.displayName}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={colors}>
              {payout.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
              {payout.type}
            </span>
          </div>

          <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>
            {payout.application.campaign.name}
          </p>

          {/* Wallet */}
          <div className="flex items-center gap-2 mb-3">
            <code
              className="text-xs px-2 py-1 rounded font-mono truncate max-w-xs"
              style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
            >
              {payout.walletAddress}
            </code>
            <button
              onClick={copyWallet}
              className="text-xs font-medium shrink-0 hover:underline"
              style={{ color: "#4f46e5" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {payout.txHash && (
            <p className="text-xs font-mono mb-3" style={{ color: "#94a3b8" }}>
              tx: {payout.txHash}
            </p>
          )}

          {/* Actions */}
          {!readonly && (
            <div className="flex items-center gap-2">
              {payout.status === "pending" && (
                <>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste transaction hash..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono outline-none transition-all"
                    style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={markSent}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 shrink-0"
                    style={{ background: "#4f46e5" }}
                    onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
                  >
                    {loading ? "…" : "Mark Sent"}
                  </button>
                </>
              )}
              {payout.status === "sent" && (
                <button
                  onClick={markConfirmed}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: "#16a34a" }}
                  onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#15803d"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
                >
                  {loading ? "…" : "Confirm Receipt"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>
            ${parseFloat(payout.amount.toString()).toFixed(4)}
          </p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>{payout.currency}</p>
          {payout.verifiedViews && (
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
              {payout.verifiedViews.toLocaleString()} views
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
