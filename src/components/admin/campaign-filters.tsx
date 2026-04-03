"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface CampaignFiltersProps {
  statusCounts: Record<string, number>;
  totalCount: number;
}

const STATUSES = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const PLATFORMS = [
  { value: "", label: "All Platforms" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "BOTH", label: "Both" },
] as const;

const NICHES = [
  { value: "", label: "All Niches" },
  { value: "FINANCE", label: "Finance" },
  { value: "TECH", label: "Tech" },
  { value: "MOTIVATION", label: "Motivation" },
  { value: "FOOD", label: "Food" },
  { value: "HUMOR", label: "Humor" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "CASINO", label: "Casino" },
] as const;

export function CampaignFilters({ statusCounts, totalCount }: CampaignFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "all";
  const currentPlatform = searchParams.get("platform") ?? "";
  const currentNiche = searchParams.get("niche") ?? "";
  const currentSearch = searchParams.get("q") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/admin/campaigns?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="mb-6 space-y-3">
      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--bg-secondary)" }}>
        {STATUSES.map(({ value, label }) => {
          const count = value === "all" ? totalCount : (statusCounts[value] ?? 0);
          const isActive = currentStatus === value;
          return (
            <button
              key={value}
              onClick={() => updateParam("status", value)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: isActive ? "var(--bg-card)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: isActive ? "var(--shadow-card)" : "none",
              }}
            >
              {label}
              <span
                className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? "var(--accent-bg)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filter dropdowns */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search campaigns..."
          defaultValue={currentSearch}
          onChange={(e) => {
            const val = e.target.value;
            // Debounce: update on blur or Enter
            if (val === currentSearch) return;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", e.currentTarget.value);
          }}
          onBlur={(e) => updateParam("q", e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
        />
        <select
          value={currentPlatform}
          onChange={(e) => updateParam("platform", e.target.value)}
          className="px-3 py-2 rounded-lg text-xs cursor-pointer"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
          }}
        >
          {PLATFORMS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={currentNiche}
          onChange={(e) => updateParam("niche", e.target.value)}
          className="px-3 py-2 rounded-lg text-xs cursor-pointer"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
          }}
        >
          {NICHES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
