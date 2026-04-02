"use client";

import { useState } from "react";

interface Payout {
  id: string;
  referredUserName: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface Props {
  referralCode: string | null;
  totalEarnings: number;
  referredCount: number;
  payouts: Payout[];
}

export function ReferralClient({ referralCode, totalEarnings, referredCount, payouts }: Props) {
  const [copied, setCopied] = useState(false);
  const referralLink = referralCode
    ? `https://clipprofit.com/sign-up?ref=${referralCode}`
    : null;

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const pendingEarnings = payouts
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Referrals</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        Share your link — earn 10% commission every time a referred creator gets paid.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total earned", value: `$${totalEarnings.toFixed(2)}`, sub: "all time" },
          { label: "Pending", value: `$${pendingEarnings.toFixed(2)}`, sub: "awaiting payment" },
          { label: "Referred creators", value: referredCount.toString(), sub: "signed up via your link" },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div
        className="rounded-xl p-6 mb-8"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Your referral link</p>
        {referralLink ? (
          <div className="flex items-center gap-3">
            <div
              className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono truncate"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors shrink-0"
              style={{ background: copied ? "#16a34a" : "var(--accent)" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your referral code is being generated. Refresh in a moment.
          </p>
        )}
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          You earn 10% of every payout made to creators who signed up with your link.
        </p>
      </div>

      {/* Payout history */}
      <div
        className="rounded-xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Commission history</p>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No commissions yet. Share your link to start earning.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Creator", "Commission", "Status", "Date"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-6 py-4 font-medium" style={{ color: "var(--text-primary)" }}>
                    {p.referredUserName}
                  </td>
                  <td className="px-6 py-4" style={{ color: "#16a34a" }}>
                    +${p.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: p.status === "paid" ? "#f0fdf4" : "#fefce8",
                        color: p.status === "paid" ? "#16a34a" : "#a16207",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
