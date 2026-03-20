"use client";

import { type MockCampaign } from "@/data/mock-campaigns";

type FeaturedCardProps = {
  campaign: MockCampaign;
  onApply: (campaign: MockCampaign) => void;
};

export function FeaturedCard({ campaign, onApply }: FeaturedCardProps) {
  const progress = Math.round((campaign.applicants / campaign.maxApplicants) * 100);

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-150"
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.16)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      }}
      onClick={() => onApply(campaign)}
    >
      <div className="p-6 md:p-8">
        {/* Top row */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {campaign.companyInitial}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{campaign.company}</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{campaign.category}</p>
            </div>
          </div>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Featured
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-end">
          {/* Left */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
              {campaign.name}
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#9ca3af" }}>
              {campaign.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {campaign.geo.map(g => (
                <span
                  key={g}
                  className="text-xs px-2.5 py-1 rounded-md font-medium"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#d1d5db" }}
                >
                  {g}
                </span>
              ))}
              <span className="text-xs ml-1" style={{ color: "#6b7280" }}>
                &middot; {campaign.daysLeft} days left
              </span>
            </div>
          </div>

          {/* Right */}
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: "#6b7280" }}>
              Total Budget
            </p>
            <p className="text-4xl font-bold text-white mb-0.5">
              {campaign.currency}{campaign.totalBudget.toLocaleString()}
            </p>
            <p className="text-xs mb-4" style={{ color: "#6b7280" }}>
              {campaign.cpvLabel} &middot; min. {campaign.minFollowers.toLocaleString()} followers
            </p>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6b7280" }}>
                <span>{campaign.applicants} applicants</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#ffffff" }} />
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); onApply(campaign); }}
              className="w-full py-3 rounded-lg text-sm font-semibold text-black transition-opacity cursor-pointer"
              style={{ background: "#ffffff" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Apply for this campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
