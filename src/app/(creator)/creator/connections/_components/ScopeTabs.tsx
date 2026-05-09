"use client";

import { type PlatformSlug, PLATFORM_ALL, PLATFORM_LABEL } from "@/lib/stats/types";
import { PLATFORM_ICONS } from "@/lib/stats/platform-icons";

export type Scope = "all" | PlatformSlug;

interface Props {
  active: Scope;
  onChange: (next: Scope) => void;
  /** Optional badge counts per platform (e.g. number of connected accounts). */
  countsByPlatform?: Partial<Record<PlatformSlug, number>>;
}

/**
 * Scope selector with a leading "All platforms" entry. Wraps the visual idiom of
 * shared/connections/PlatformTabs without modifying the underlying ConnectionPlatform union.
 */
export function ScopeTabs({ active, onChange, countsByPlatform }: Props) {
  const tabs: Array<{ id: Scope; label: string; icon?: React.ReactNode; count?: number }> = [
    { id: "all", label: "All platforms" },
    ...PLATFORM_ALL.map((p) => ({
      id: p,
      label: PLATFORM_LABEL[p],
      icon: PLATFORM_ICONS[p],
      count: countsByPlatform?.[p],
    })),
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: isActive ? "var(--primary)" : "transparent",
              color: isActive ? "#fff" : "var(--text-secondary)",
              border: isActive ? "none" : "1px solid var(--border)",
            }}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 ? (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold"
                style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg-card)",
                  color: isActive ? "#fff" : "var(--text-muted)",
                }}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
