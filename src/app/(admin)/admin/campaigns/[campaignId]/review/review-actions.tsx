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
      <p className="text-sm font-semibold text-gray-800">Review Decision</p>

      {/* Action selector */}
      <div className="flex gap-3">
        <button
          onClick={() => setAction("approve")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            action === "approve" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
          }`}
        >
          Approve & activate
        </button>
        <button
          onClick={() => setAction("reject")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            action === "reject" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
          }`}
        >
          Reject
        </button>
      </div>

      {action === "approve" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Set campaign economics</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Goal views *</label>
              <input
                type="number"
                min={1}
                value={goalViewsRaw}
                onChange={(e) => setGoalViewsRaw(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 10000000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Admin margin ($/1M views)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  step="1"
                  value={adminMarginPerM}
                  onChange={(e) => setAdminMarginPerM(e.target.value)}
                  className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="25"
                />
              </div>
            </div>
          </div>

          {businessCpv !== null && creatorCpv !== null && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Client pays (per 1M views)</span>
                <span className="font-medium">${(businessCpv * 1_000_000).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Your margin</span>
                <span>−${margin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 text-gray-700">
                <span>Creator earns (per 1M views)</span>
                <span className={`font-semibold ${creatorCpv < 0 ? "text-red-600" : ""}`}>
                  ${(creatorCpv * 1_000_000).toFixed(2)}
                </span>
              </div>
              {adminRevenue !== null && (
                <div className="flex justify-between text-purple-700 font-medium border-t border-gray-200 pt-1.5">
                  <span>Your total revenue</span>
                  <span>${adminRevenue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {action === "reject" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm text-gray-700 mb-1.5">Reason for rejection *</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="e.g. Deposit not confirmed, campaign content violates guidelines…"
          />
          <p className="text-xs text-gray-400 mt-1">This will be shown to the campaign owner.</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      {action && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
            action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {loading ? "Processing…" : action === "approve" ? "Approve & activate campaign" : "Reject campaign"}
        </button>
      )}
    </div>
  );
}
