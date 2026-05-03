"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Eligibility {
  status: "eligible" | "ineligible" | "unknown";
  reason?: string;
}

interface CampaignData {
  id: string;
  name: string;
  description: string;
  rewardRate: number;
  totalBudget: number;
  totalPaid: number;
  platform: string;
  platforms: string[];
  contentType: string;
  niche: string | null;
  brandName: string;
  bannerUrl: string | null;
  deadlineIso: string;
  createdAtIso: string;
  eligibility: Eligibility;
  applicationId?: string;
}

interface CampaignsClientProps {
  marketplace: CampaignData[];
  myCampaigns: CampaignData[];
}

type SortKey = "recommended" | "newest" | "highest-cpv" | "ending-soon";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "newest", label: "Newest" },
  { key: "highest-cpv", label: "Highest payout" },
  { key: "ending-soon", label: "Ending soon" },
];

export function CampaignsClient({ marketplace, myCampaigns }: CampaignsClientProps) {
  const [activeTab, setActiveTab] = useState<"my" | "marketplace">("marketplace");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("recommended");

  const campaigns = activeTab === "my" ? myCampaigns : marketplace;

  const filtered = useMemo(() => {
    const result = campaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (platformFilter !== "all" && !c.platforms.includes(platformFilter)) return false;
      if (typeFilter !== "all" && c.contentType !== typeFilter) return false;
      return true;
    });
    return sortCampaigns(result, sort);
  }, [campaigns, search, platformFilter, typeFilter, sort]);

  const filtersActive =
    search.trim().length > 0 || platformFilter !== "all" || typeFilter !== "all";

  return (
    <div className="p-6 w-full space-y-6">
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
        <FilterSelect
          label="Platform"
          value={platformFilter}
          onChange={setPlatformFilter}
          options={[
            { value: "all", label: "All platforms" },
            { value: "INSTAGRAM", label: "Instagram" },
            { value: "TIKTOK", label: "TikTok" },
            { value: "YOUTUBE_SHORTS", label: "YouTube" },
            { value: "FACEBOOK", label: "Facebook" },
          ]}
        />
        <FilterSelect
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "All types" },
            { value: "UGC", label: "UGC" },
            { value: "Promotion", label: "Promotion" },
            { value: "Sponsored", label: "Sponsored" },
          ]}
        />
        <div className="ml-auto">
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
          />
        </div>
      </div>

      {/* Campaign Grid */}
      {filtered.length === 0 ? (
        activeTab === "my" && !filtersActive ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            }
            title="No campaigns joined yet"
            description="Browse the marketplace to find campaigns that match your platforms and niche."
            primaryCta={{
              label: "Browse marketplace",
              onClick: () => setActiveTab("marketplace"),
            }}
          />
        ) : (
          <EmptyState
            title="No campaigns match your filters"
            description="Try clearing the platform or type filter, or change the sort."
            primaryCta={
              filtersActive
                ? {
                    label: "Reset filters",
                    onClick: () => {
                      setSearch("");
                      setPlatformFilter("all");
                      setTypeFilter("all");
                    },
                  }
                : undefined
            }
          />
        )
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-md text-sm outline-none cursor-pointer"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          color: "var(--text-primary)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function sortCampaigns(list: CampaignData[], sort: SortKey): CampaignData[] {
  const arr = [...list];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
    case "highest-cpv":
      return arr.sort((a, b) => b.rewardRate - a.rewardRate);
    case "ending-soon":
      return arr.sort((a, b) => a.deadlineIso.localeCompare(b.deadlineIso));
    case "recommended":
    default:
      // Eligible first, then highest CPV
      return arr.sort((a, b) => {
        const aEligible = a.eligibility.status === "eligible" ? 0 : 1;
        const bEligible = b.eligibility.status === "eligible" ? 0 : 1;
        if (aEligible !== bEligible) return aEligible - bEligible;
        return b.rewardRate - a.rewardRate;
      });
  }
}

function daysUntil(iso: string): number | null {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  if (diff < 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function CampaignCard({ campaign }: { campaign: CampaignData }) {
  const progress = campaign.totalBudget > 0
    ? Math.min((campaign.totalPaid / campaign.totalBudget) * 100, 100)
    : 0;

  const brandInitial = campaign.brandName.charAt(0).toUpperCase();
  const days = daysUntil(campaign.deadlineIso);

  const cardContent = (
    <div
      className="rounded-xl p-5 transition-all hover:shadow-md cursor-pointer h-full flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Header: Brand logo + name + eligibility */}
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
        <div className="min-w-0 flex-1">
          <h3
            className="text-sm font-semibold leading-tight line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {campaign.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {campaign.eligibility.status === "eligible" && (
              <Badge variant="eligible">You qualify</Badge>
            )}
            {campaign.eligibility.status === "ineligible" && campaign.eligibility.reason && (
              <Badge variant="ineligible">{campaign.eligibility.reason}</Badge>
            )}
            {days !== null && days <= 7 && (
              <Badge variant="ending-soon">
                {days === 0 ? "Ends today" : `${days}d left`}
              </Badge>
            )}
          </div>
        </div>
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
