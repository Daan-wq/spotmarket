"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";

interface CampaignData {
  id: string;
  name: string;
  description: string;
  rewardRate: number;
  totalBudget: number;
  totalPaid: number;
  platform: string;
  contentType: string;
  niche: string | null;
  brandName: string;
  bannerUrl: string | null;
  applicationId?: string;
}

interface CampaignsClientProps {
  marketplace: CampaignData[];
  myCampaigns: CampaignData[];
}


export function CampaignsClient({ marketplace, myCampaigns }: CampaignsClientProps) {
  const [activeTab, setActiveTab] = useState<"my" | "marketplace">("marketplace");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const campaigns = activeTab === "my" ? myCampaigns : marketplace;

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (typeFilter !== "all" && c.contentType !== typeFilter) return false;
      return true;
    });
  }, [campaigns, search, platformFilter, typeFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Tab Toggle */}
      <div className="flex justify-center">
        <div
          className="inline-flex rounded-lg p-1"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
        >
          <button
            onClick={() => setActiveTab("my")}
            className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer"
            style={{
              background: activeTab === "my" ? "var(--bg-primary)" : "transparent",
              color: activeTab === "my" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: activeTab === "my" ? "var(--shadow-card)" : "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            Joined Campaigns
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer"
            style={{
              background: activeTab === "marketplace" ? "var(--bg-primary)" : "transparent",
              color: activeTab === "marketplace" ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: activeTab === "marketplace" ? "var(--shadow-card)" : "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
              <path d="M2 7h20" />
            </svg>
            Marketplace
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2"
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--text-muted)" }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Find your perfect campaign..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-muted)" }}>Platform</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All platforms</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-muted)" }}>Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm outline-none cursor-pointer"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All types</option>
            <option value="UGC">UGC</option>
            <option value="Promotion">Promotion</option>
            <option value="Sponsored">Sponsored</option>
          </select>
        </div>
      </div>

      {/* Campaign Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          {activeTab === "my" ? (
            <>
              <div className="flex justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>No campaigns yet</h3>
              <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                You haven&apos;t joined any campaigns yet. Explore the marketplace to find campaigns that match your style!
              </p>
              <button
                onClick={() => setActiveTab("marketplace")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{ background: "var(--primary)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                Find my first campaign!
              </button>
            </>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>No campaigns match your filters</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignData }) {
  const progress = campaign.totalBudget > 0
    ? Math.min((campaign.totalPaid / campaign.totalBudget) * 100, 100)
    : 0;

  const brandInitial = campaign.brandName.charAt(0).toUpperCase();

  const cardContent = (
    <div
      className="rounded-xl p-5 transition-all hover:shadow-md cursor-pointer h-full flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Header: Brand logo + name */}
      <div className="flex items-start gap-3 mb-3">
        {campaign.bannerUrl ? (
          <img src={campaign.bannerUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "var(--primary)" }}
          >
            {brandInitial}
          </div>
        )}
        <h3
          className="text-sm font-semibold leading-tight line-clamp-2"
          style={{ color: "var(--text-primary)" }}
        >
          {campaign.name}
        </h3>
      </div>

      {/* Reward Rate */}
      <div className="mb-3">
        <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          ${campaign.rewardRate.toFixed(1)}
        </span>
        <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>/1K views</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--border-default)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: "var(--primary)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>${campaign.totalPaid.toFixed(0)} of ${campaign.totalBudget.toFixed(0)} paid out</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      </div>

      {/* Footer: Platform icons + Type badge */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={campaign.platform} size={24} />
        </div>
        <span
          className="text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{ background: "var(--accent-bg)", color: "var(--primary)" }}
        >
          {campaign.contentType}
        </span>
      </div>

      {/* Submit button for joined campaigns */}
      {campaign.applicationId && (
        <Link
          href={`/creator/applications/${campaign.applicationId}/submit`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 mt-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: "var(--primary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Submit Content
        </Link>
      )}
    </div>
  );

  return (
    <Link href={`/creator/campaigns/${campaign.id}`}>
      {cardContent}
    </Link>
  );
}
