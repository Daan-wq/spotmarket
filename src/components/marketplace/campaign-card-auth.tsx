"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type MockCampaign } from "@/data/mock-campaigns";

type Props = {
  campaign: MockCampaign;
  isMock: boolean;
  creatorProfileId?: string;
  applicationStatus?: string;
};

export function CampaignCardAuth({ campaign, isMock, applicationStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const progress = Math.round((campaign.applicants / campaign.maxApplicants) * 100);
  const isUrgent = campaign.daysLeft <= 15;
  const isFull = progress >= 90;

  async function handleApply() {
    if (isMock) return;
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
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid #f3f4f6" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "#111827" }}
          >
            {campaign.companyInitial}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#111827" }}>{campaign.company}</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>{campaign.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isMock && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280" }}>
              Preview
            </span>
          )}
          {!isMock && isFull && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#b91c1c" }}>
              Almost full
            </span>
          )}
          {!isMock && isUrgent && !isFull && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#fffbeb", color: "#92400e" }}>
              Ending soon
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 py-4">
        <h3 className="text-sm font-semibold mb-1 leading-snug" style={{ color: "#111827" }}>
          {campaign.name}
        </h3>
        <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: "#6b7280" }}>
          {campaign.description}
        </p>

        <div className="mb-4">
          <p className="text-2xl font-bold tracking-tight" style={{ color: "#111827" }}>
            {campaign.currency}{campaign.totalBudget.toLocaleString()}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
            total budget &middot; {campaign.cpvLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {campaign.geo.map(g => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "#f3f4f6", color: "#374151" }}>
              {g}
            </span>
          ))}
          <span className="text-xs ml-auto" style={{ color: isUrgent ? "#92400e" : "#9ca3af" }}>
            {campaign.daysLeft}d left
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#9ca3af" }}>
            <span>{campaign.applicants} applicants</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: isFull ? "#ef4444" : "#111827" }}
            />
          </div>
        </div>

        {/* CTA */}
        {isMock ? (
          <a
            href="/api/auth/instagram"
            className="mt-auto w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-opacity cursor-pointer"
            style={{ background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#d1d5db")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
          >
            Connect Instagram to Apply
          </a>
        ) : applicationStatus && statusConfig[applicationStatus] ? (
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
            style={{ background: "#111827" }}
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
