"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type CampaignCardData } from "@/types/campaign-card";

type DealCardProps = {
  campaign: CampaignCardData;
  creatorProfileId?: string;
  applicationStatus?: string;
};

export function DealCard({ campaign, applicationStatus }: DealCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const statusConfig: Record<string, { background: string; color: string; label: string }> = {
    approved:  { background: "#f0fdf4", color: "#15803d", label: "Approved"  },
    pending:   { background: "#fffbeb", color: "#92400e", label: "Pending"   },
    rejected:  { background: "#fef2f2", color: "#b91c1c", label: "Rejected"  },
    active:    { background: "#f0fdf4", color: "#15803d", label: "Active"    },
    completed: { background: "#f3f4f6", color: "#6b7280", label: "Completed" },
    disputed:  { background: "#fff7ed", color: "#c2410c", label: "Disputed"  },
  };

  async function handleApply() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/applications`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-150"
      style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
        (e.currentTarget as HTMLElement).style.background = "#ffffff";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
        (e.currentTarget as HTMLElement).style.background = "#f9fafb";
      }}
    >
      {/* Brand row */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: "#111827" }}
        >
          {campaign.companyInitial}
        </div>
        <p className="text-sm font-semibold" style={{ color: "#111827" }}>{campaign.company}</p>
      </div>

      <p className="text-sm font-medium leading-snug" style={{ color: "#374151" }}>{campaign.name}</p>

      <div className="flex items-baseline gap-3">
        <span className="text-xl font-bold tracking-tight" style={{ color: "#111827" }}>
          {campaign.currency}{(campaign.totalBudget / 1000).toFixed(0)}K
        </span>
        <span className="text-xs" style={{ color: "#9ca3af" }}>{campaign.daysLeft}d left</span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1" style={{ borderTop: "1px solid #f3f4f6" }}>
        <span className="text-xs" style={{ color: "#9ca3af" }}>Paid Per View</span>
        {applicationStatus && statusConfig[applicationStatus] ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={statusConfig[applicationStatus]}>
            {statusConfig[applicationStatus].label}
          </span>
        ) : (
          <button
            onClick={handleApply}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity cursor-pointer disabled:opacity-50"
            style={{ background: "#111827", color: "#ffffff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {loading ? "…" : "Apply Now"}
          </button>
        )}
      </div>
    </div>
  );
}
