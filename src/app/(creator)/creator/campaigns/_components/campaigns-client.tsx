"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
} from "../../_components/creator-journey";

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

type CampaignTab = "marketplace" | "my";
type SortKey = "recommended" | "newest" | "highest-cpv" | "ending-soon";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "newest", label: "Newest" },
  { key: "highest-cpv", label: "Highest payout" },
  { key: "ending-soon", label: "Ending soon" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE_SHORTS", label: "YouTube" },
  { value: "FACEBOOK", label: "Facebook" },
];

export function CampaignsClient({ marketplace, myCampaigns }: CampaignsClientProps) {
  const [activeTab, setActiveTab] = useState<CampaignTab>("marketplace");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("recommended");

  const campaigns = activeTab === "my" ? myCampaigns : marketplace;
  const filtersActive =
    search.trim().length > 0 || platformFilter !== "all" || typeFilter !== "all";
  const eligibleCount = marketplace.filter((c) => c.eligibility.status === "eligible").length;

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set([...marketplace, ...myCampaigns].map((c) => c.contentType).filter(Boolean)));
    return [{ value: "all", label: "All types" }, ...values.map((value) => ({ value, label: value }))];
  }, [marketplace, myCampaigns]);

  const filtered = useMemo(() => {
    const result = campaigns.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      if (platformFilter !== "all" && !c.platforms.includes(platformFilter)) return false;
      if (typeFilter !== "all" && c.contentType !== typeFilter) return false;
      return true;
    });
    return sortCampaigns(result, sort);
  }, [campaigns, search, platformFilter, typeFilter, sort]);

  function resetFilters() {
    setSearch("");
    setPlatformFilter("all");
    setTypeFilter("all");
    setSort("recommended");
  }

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Campaigns"
        title="Campaigns"
        description="Find the campaign that fits your pages, then open the brief or submit from joined work."
      />

      <section>
        <CreatorSectionHeader title="Campaign snapshot" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SoftStat label="Marketplace" value={marketplace.length.toString()} detail="Active campaigns" />
          <SoftStat label="You qualify for" value={eligibleCount.toString()} detail="Based on connected pages" />
          <SoftStat label="Joined" value={myCampaigns.length.toString()} detail="Ready for brief or submit" />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-full rounded-xl border border-neutral-200 bg-neutral-50 p-1 md:w-auto">
            <TabButton active={activeTab === "marketplace"} onClick={() => setActiveTab("marketplace")}>
              Marketplace
            </TabButton>
            <TabButton active={activeTab === "my"} onClick={() => setActiveTab("my")}>
              Joined campaigns
            </TabButton>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:max-w-3xl">
            <label className="relative flex-1">
              <span className="sr-only">Search campaigns</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search campaigns"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-400 focus:bg-white"
              />
            </label>
            <ProgressiveActionDrawer
              triggerLabel="Filters"
              title="Refine campaigns"
              description="Use this only when the default recommendations are too broad."
              variant="outline"
              width="md"
              badgeLabel={filtersActive ? "On" : undefined}
            >
              <div className="space-y-4">
                <FilterSelect label="Platform" value={platformFilter} onChange={setPlatformFilter} options={PLATFORM_OPTIONS} />
                <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
                <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as SortKey)} options={SORTS.map((s) => ({ value: s.key, label: s.label }))} />
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
                >
                  Reset filters
                </button>
              </div>
            </ProgressiveActionDrawer>
          </div>
        </div>

        <CreatorSectionHeader
          title={activeTab === "my" ? "Joined campaigns" : "Marketplace"}
          description={activeTab === "my" ? "Campaigns you can act on next." : "Campaigns sorted by eligibility and payout by default."}
        />

        {filtered.length === 0 ? (
          activeTab === "my" && !filtersActive ? (
            <EmptyState
              title="No campaigns joined yet"
              description="Browse the marketplace to find campaigns that match your platforms and niche."
              primaryCta={{ label: "Browse marketplace", onClick: () => setActiveTab("marketplace") }}
            />
          ) : (
            <EmptyState
              title="No campaigns match your filters"
              description="Try clearing the filters or changing the search."
              primaryCta={filtersActive ? { label: "Reset filters", onClick: resetFilters } : undefined}
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition md:flex-none ${
        active ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
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
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
  const progress = campaign.totalBudget > 0 ? Math.min((campaign.totalPaid / campaign.totalBudget) * 100, 100) : 0;
  const brandInitial = campaign.brandName.charAt(0).toUpperCase();
  const days = daysUntil(campaign.deadlineIso);
  const primaryHref = campaign.applicationId
    ? `/creator/applications/${campaign.applicationId}/submit`
    : `/creator/campaigns/${campaign.id}`;
  const primaryLabel = campaign.applicationId ? "Submit clip" : "Review brief";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5 transition hover:border-neutral-300 hover:bg-white">
      <div className="flex items-start gap-3">
        {campaign.bannerUrl ? (
          <img src={campaign.bannerUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-sm font-bold text-white">
            {brandInitial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-normal text-neutral-950">
            {campaign.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {campaign.eligibility.status === "eligible" ? <Badge variant="eligible">You qualify</Badge> : null}
            {campaign.eligibility.status === "ineligible" && campaign.eligibility.reason ? (
              <Badge variant="ineligible">{campaign.eligibility.reason}</Badge>
            ) : null}
            {days !== null && days <= 7 ? (
              <Badge variant="ending-soon">{days === 0 ? "Ends today" : `${days}d left`}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs font-medium text-neutral-500">Payout</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-normal text-neutral-950">
          ${campaign.rewardRate.toFixed(1)}
        </span>
        <span className="text-sm text-neutral-500">/1K views</span>
      </div>

      <div className="mt-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-neutral-950 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-neutral-500">
          <span>${campaign.totalPaid.toFixed(0)} of ${campaign.totalBudget.toFixed(0)} paid</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {campaign.platforms.slice(0, 4).map((platform) => (
            <PlatformIcon key={platform} platform={platform} size={24} />
          ))}
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200">
          {campaign.contentType}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition hover:bg-neutral-800"
        >
          {primaryLabel}
        </Link>
        {campaign.applicationId ? (
          <Link
            href={`/creator/campaigns/${campaign.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
          >
            Brief
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
