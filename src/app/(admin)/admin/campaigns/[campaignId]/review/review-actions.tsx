"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  campaignId: string;
  totalBudget: number;
  goalViews: number | null;
}

export function ReviewActions({ campaignId, totalBudget, goalViews: initialGoalViews }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [adminMarginPerM, setAdminMarginPerM] = useState("25");
  const [goalViewsRaw, setGoalViewsRaw] = useState(
    initialGoalViews ? String(initialGoalViews) : ""
  );
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const margin = parseFloat(adminMarginPerM) || 0;
  const goalViews = parseInt(goalViewsRaw) || 0;
  const businessCpv = goalViews > 0 ? totalBudget / goalViews : null;
  const creatorCpv = businessCpv !== null ? businessCpv - margin / 1_000_000 : null;
  const adminRevenue = goalViews > 0 ? (margin / 1_000_000) * goalViews : null;

  async function handleSubmit() {
    if (!action) return;
    if (action === "approve" && (!goalViewsRaw || goalViews <= 0)) {
      setError("Goal views is required to approve");
      return;
    }
    if (action === "reject" && !rejectReason.trim()) {
      setError("Rejection reason is required");
      return;
    }
    if (action === "approve" && creatorCpv !== null && creatorCpv < 0) {
      setError("Margin too high — creator CPV would be negative");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/admin-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminMarginPerM: margin,
          goalViews: goalViews || undefined,
          rejectReason: rejectReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to process review");
        return;
      }

      router.push("/admin/campaigns");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Review Decision</p>

      {/* Action selector */}
      <div className="flex gap-3">
        <button
          onClick={() => setAction("approve")}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={action === "approve" ? { background: "var(--success)", color: "#ffffff", borderColor: "var(--success)" } : { background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
        >
          Approve & activate
        </button>
        <button
          onClick={() => setAction("reject")}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={action === "reject" ? { background: "var(--error)", color: "#ffffff", borderColor: "var(--error)" } : { background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
        >
          Reject
        </button>
      </div>

      {action === "approve" && (
        <div className="border rounded-xl p-4 space-y-4" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Set campaign economics</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Goal views *</label>
              <input
                type="number"
                min={1}
                value={goalViewsRaw}
                onChange={(e) => setGoalViewsRaw(e.target.value)}
                style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                placeholder="e.g. 10000000"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Admin margin ($/1M views)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>$</span>
                <input
                  type="number"
                  step="1"
                  value={adminMarginPerM}
                  onChange={(e) => setAdminMarginPerM(e.target.value)}
                  style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}
                  className="w-full px-3 py-2 pl-7 border rounded-lg text-sm focus:outline-none"
                  placeholder="25"
                />
              </div>
            </div>
          </div>

          {businessCpv !== null && creatorCpv !== null && (
            <div className="rounded-lg border p-3 text-sm space-y-1.5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Client pays (per 1M views)</span>
                <span className="font-medium">${(businessCpv * 1_000_000).toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--error)" }}>
                <span>Your margin</span>
                <span>−${margin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5" style={{ borderTopColor: "var(--border)", color: "var(--text-secondary)" }}>
                <span>Creator earns (per 1M views)</span>
                <span className="font-semibold" style={{ color: creatorCpv < 0 ? "var(--error)" : "var(--text-primary)" }}>
                  ${(creatorCpv * 1_000_000).toFixed(2)}
                </span>
              </div>
              {adminRevenue !== null && (
                <div className="flex justify-between border-t pt-1.5 font-medium" style={{ borderTopColor: "var(--border)", color: "var(--accent)" }}>
                  <span>Your total revenue</span>
                  <span>${adminRevenue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {action === "reject" && (
        <div className="border rounded-xl p-4" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>Reason for rejection *</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none"
            placeholder="e.g. Deposit not confirmed, campaign content violates guidelines…"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>This will be shown to the campaign owner.</p>
        </div>
      )}

      {error && (
        <p className="text-sm rounded-lg p-3 border" style={{ color: "var(--error-text)", background: "var(--error-bg)", borderColor: "var(--error)" }}>{error}</p>
      )}

      {action && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: action === "approve" ? "var(--success)" : "var(--error)" }}
        >
          {loading ? "Processing…" : action === "approve" ? "Approve & activate campaign" : "Reject campaign"}
        </button>
      )}
    </div>
  );
}
