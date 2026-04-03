"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@prisma/client";

const TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft:            ["active", "cancelled"],
  pending_payment:  ["cancelled"],
  pending_review:   ["active", "cancelled"],
  active:           ["paused", "completed", "cancelled"],
  paused:           ["active", "cancelled"],
  completed:        [],
  cancelled:        [],
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft:            "Draft",
  pending_payment:  "Awaiting Payment",
  pending_review:   "Pending Review",
  active:           "Active",
  paused:           "Paused",
  completed:        "Completed",
  cancelled:        "Cancelled",
};

const STATUS_STYLE: Record<CampaignStatus, { backgroundColor: string; color: string }> = {
  draft:            { backgroundColor: "var(--bg-secondary)",  color: "var(--text-muted)" },
  pending_payment:  { backgroundColor: "var(--warning-bg)",   color: "var(--warning-text)" },
  pending_review:   { backgroundColor: "var(--accent-bg)",    color: "var(--accent-foreground)" },
  active:           { backgroundColor: "var(--success-bg)",   color: "var(--success-text)" },
  paused:           { backgroundColor: "var(--accent-bg)",    color: "var(--accent-foreground)" },
  completed:        { backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" },
  cancelled:        { backgroundColor: "var(--error-bg)",     color: "var(--error-text)" },
};

export function CampaignStatusToggle({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: CampaignStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const transitions = TRANSITIONS[currentStatus];

  async function changeStatus(newStatus: CampaignStatus) {
    setLoading(true);
    await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-sm px-3 py-1.5 rounded-full font-medium"
        style={STATUS_STYLE[currentStatus]}
      >
        {STATUS_LABELS[currentStatus]}
      </span>
      {transitions.map((s) => (
        <button
          key={s}
          onClick={() => changeStatus(s)}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "var(--bg-elevated)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
        >
          → {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
