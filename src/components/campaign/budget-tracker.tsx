"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface BudgetData {
  totalBudget: number;
  totalSpend: number;
  remainingBudget: number;
  totalViews: number;
  goalViews: number | null;
  remainingViews: number | null;
  percentComplete: number;
}

export function CampaignBudgetTracker({
  campaignId,
  initialData,
}: {
  campaignId: string;
  initialData: BudgetData;
}) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`campaign-${campaignId}`);

    channel
      .on("broadcast", { event: "campaign:views_updated" }, ({ payload }) => {
        if (payload.campaignId === campaignId) {
          setData((prev) => ({
            ...prev,
            totalViews: payload.totalViews ?? prev.totalViews,
            totalSpend: payload.totalSpend ?? prev.totalSpend,
            percentComplete: payload.percentUsed ?? prev.percentComplete,
            remainingBudget: Math.max(0, prev.totalBudget - (payload.totalSpend ?? prev.totalSpend)),
            remainingViews: prev.goalViews ? Math.max(0, prev.goalViews - (payload.totalViews ?? prev.totalViews)) : null,
          }));
        }
      })
      .on("broadcast", { event: "campaign:budget_exhausted" }, ({ payload }) => {
        if (payload.campaignId === campaignId) {
          setData((prev) => ({
            ...prev,
            totalViews: payload.totalViews ?? prev.totalViews,
            totalSpend: payload.totalSpend ?? prev.totalSpend,
            percentComplete: 100,
            remainingBudget: 0,
            remainingViews: 0,
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const pct = Math.min(100, data.percentComplete);
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            €{data.totalBudget.toLocaleString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>total campaign budget</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            €{data.remainingBudget.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>remaining</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {data.totalViews.toLocaleString()} views
            {data.goalViews ? ` / ${data.goalViews.toLocaleString()}` : ""}
          </span>
          <span className="text-xs font-medium" style={{ color: barColor }}>{pct}%</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 pt-3" style={{ borderTop: "1px solid var(--muted)" }}>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Spent</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
            €{data.totalSpend.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Views</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {data.totalViews.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Remaining Views</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {data.remainingViews !== null ? data.remainingViews.toLocaleString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
