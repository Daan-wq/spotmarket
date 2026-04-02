"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    approved:  { background: "var(--success-bg)", color: "var(--success-text)", label: "Approved"  },
    pending:   { background: "var(--warning-bg)", color: "var(--warning-text)", label: "Pending"   },
    rejected:  { background: "var(--error-bg)", color: "var(--error-text)", label: "Rejected"  },
    active:    { background: "var(--success-bg)", color: "var(--success-text)", label: "Active"    },
    completed: { background: "var(--muted)", color: "var(--text-secondary)", label: "Completed" },
    disputed:  { background: "var(--warning-bg)", color: "var(--warning-text)", label: "Disputed"  },
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
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Brand row */}
      <Link
        href={campaign.launchedBy ? `/profile/${campaign.launchedBy.id}` : `/campaigns/${campaign.id}`}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
          style={{ background: "var(--accent)" }}
        >
          {campaign.launchedBy?.avatarUrl
            ? <img src={campaign.launchedBy.avatarUrl} alt={campaign.launchedBy.name} className="w-full h-full object-cover" />
            : (campaign.launchedBy?.name?.[0] ?? campaign.companyInitial).toUpperCase()
          }
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {campaign.launchedBy?.name ?? campaign.company}
        </p>
      </Link>

      <Link href={`/campaigns/${campaign.id}`} className="hover:opacity-80 transition-opacity">
        <p className="text-sm font-medium leading-snug" style={{ color: "var(--card-foreground)" }}>{campaign.name}</p>
      </Link>

      <div className="flex items-baseline gap-3">
        <span className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {campaign.currency}{(campaign.totalBudget / 1000).toFixed(0)}K
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{campaign.daysLeft}d left</span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1" style={{ borderTop: "1px solid var(--muted)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Paid Per View</span>
        {applicationStatus && statusConfig[applicationStatus] ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={statusConfig[applicationStatus]}>
            {statusConfig[applicationStatus].label}
          </span>
        ) : (
          <button
            onClick={handleApply}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity cursor-pointer disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#ffffff" }}
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
