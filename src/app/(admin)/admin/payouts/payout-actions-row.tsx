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
  pending:    { backgroundColor: "var(--warning-bg)", color: "var(--warning-text)" },
  processing: { backgroundColor: "var(--accent-bg)", color: "var(--accent-foreground)" },
  sent:       { backgroundColor: "var(--accent-bg)", color: "var(--accent-foreground)" },
  confirmed:  { backgroundColor: "var(--success-bg)", color: "var(--success-text)" },
  failed:     { backgroundColor: "var(--error-bg)", color: "var(--error-text)" },
  disputed:   { backgroundColor: "var(--warning-bg)", color: "var(--warning-text)" },
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
    <div className="px-5 py-5" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {payout.application.creatorProfile.displayName}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={colors}>
              {payout.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "var(--bg-card)", color: "var(--card-foreground)" }}>
              {payout.type}
            </span>
          </div>

          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            {payout.application.campaign.name}
          </p>

          {/* Wallet */}
          <div className="flex items-center gap-2 mb-3">
            <code
              className="text-xs px-2 py-1 rounded font-mono truncate max-w-xs"
              style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              {payout.walletAddress}
            </code>
            <button
              onClick={copyWallet}
              className="text-xs font-medium shrink-0 hover:underline"
              style={{ color: "var(--accent)" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {payout.txHash && (
            <p className="text-xs font-mono mb-3" style={{ color: "var(--text-muted)" }}>
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
                    style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={markSent}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 shrink-0"
                    style={{ background: "var(--accent)" }}
                    onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
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
                  style={{ background: "var(--success)" }}
                  onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--success-text)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--success)"; }}
                >
                  {loading ? "…" : "Confirm Receipt"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            ${parseFloat(payout.amount.toString()).toFixed(4)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{payout.currency}</p>
          {payout.verifiedViews && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {payout.verifiedViews.toLocaleString()} views
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
