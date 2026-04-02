"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type CampaignCardData } from "@/types/campaign-card";

type Props = {
  campaign: CampaignCardData;
  creatorProfileId?: string;
  applicationStatus?: string;
};

export function CampaignCardAuth({ campaign, applicationStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const progress = Math.round((campaign.applicants / campaign.maxApplicants) * 100);
  const isUrgent = campaign.daysLeft <= 15;
  const isFull = progress >= 90;

  async function handleApply() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/applications`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    approved:  { bg: "#f0fdf4", text: "#15803d", label: "Approved" },
    pending:   { bg: "#fffbeb", text: "#92400e", label: "Under review" },
    rejected:  { bg: "#fef2f2", text: "#b91c1c", label: "Rejected" },
    active:    { bg: "#f0fdf4", text: "#15803d", label: "Active" },
    completed: { bg: "#f3f4f6", text: "#6b7280", label: "Completed" },
    disputed:  { bg: "#fff7ed", text: "#c2410c", label: "Disputed" },
  };

  return (
    <div
      className="rounded-xl flex flex-col transition-all duration-150"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", borderWidth: "1px" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--muted)" }}>
        <Link
          href={campaign.launchedBy ? `/profile/${campaign.launchedBy.id}` : `/campaigns/${campaign.id}`}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
            style={{ background: "var(--text-primary)" }}
          >
            {campaign.launchedBy?.avatarUrl
              ? <img src={campaign.launchedBy.avatarUrl} alt={campaign.launchedBy.name} className="w-full h-full object-cover" />
              : (campaign.launchedBy?.name?.[0] ?? campaign.companyInitial).toUpperCase()
            }
          </div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {campaign.launchedBy?.name ?? campaign.company}
          </p>
        </Link>
        <div className="flex items-center gap-1.5">
          {isFull && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
              Almost full
            </span>
          )}
          {isUrgent && !isFull && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
              Ending soon
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 py-4">
        <h3 className="text-sm font-semibold mb-1 leading-snug" style={{ color: "var(--text-primary)" }}>{campaign.name}</h3>
        <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{campaign.description}</p>

        <div className="mb-4">
          <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {campaign.currency}{campaign.totalBudget.toLocaleString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            total budget &middot; {campaign.cpvLabel}
          </p>
        </div>

        {/* Budget / Views progress */}
        {campaign.goalViews && campaign.goalViews > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span>{campaign.currentViews.toLocaleString()} / {campaign.goalViews.toLocaleString()} views</span>
              <span>{Math.min(100, Math.round((campaign.currentViews / campaign.goalViews) * 100))}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              {(() => {
                const pct = Math.min(100, Math.round((campaign.currentViews / (campaign.goalViews ?? 1)) * 100));
                const color = pct >= 90 ? "var(--error)" : pct >= 70 ? "var(--warning-text)" : "#22c55e";
                return <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />;
              })()}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {campaign.currency}{campaign.remainingBudget.toLocaleString()} remaining
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {campaign.geo.map(g => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "var(--muted)", color: "var(--card-foreground)" }}>
              {g}
            </span>
          ))}
          <span className="text-xs ml-auto" style={{ color: isUrgent ? "var(--warning-text)" : "var(--text-muted)" }}>
            {campaign.daysLeft}d left
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>{campaign.applicants} applicants</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: isFull ? "var(--error)" : "var(--text-primary)" }} />
          </div>
        </div>

        {applicationStatus && statusConfig[applicationStatus] ? (
          <span
            className="mt-auto w-full py-2.5 rounded-lg text-sm font-semibold text-center"
            style={{ background: statusConfig[applicationStatus].bg, color: statusConfig[applicationStatus].text }}
          >
            {statusConfig[applicationStatus].label}
          </span>
        ) : (
          <button
            onClick={handleApply}
            disabled={loading}
            className="mt-auto w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity cursor-pointer disabled:opacity-50"
            style={{ background: "var(--text-primary)" }}
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.opacity = "0.85"); }}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {loading ? "Applying…" : "Apply Now"}
          </button>
        )}
      </div>
    </div>
  );
}
