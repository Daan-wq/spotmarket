"use client";

import { type ReactNode, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type PlatformSlug, PLATFORM_LABEL } from "@/lib/stats/types";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import type { RangeKey } from "@/lib/stats/range";
import { ScopeTabs, type Scope } from "./ScopeTabs";
import { AccountChipsRow } from "./AccountChipsRow";

export type SubTab = "overview" | "content" | "timeline" | "audience" | "insights";

export interface AccountsWorkspaceAccount {
  id: string;
  username: string;
}

export interface AccountsWorkspaceProps {
  scope: Scope;
  accountId: string | "all";
  subTab: SubTab;
  rangeKey: RangeKey;
  /** Connection inventory keyed by platform — drives the chip row and the count badges. */
  accountsByPlatform: Record<PlatformSlug, AccountsWorkspaceAccount[]>;
  /** Pre-rendered "Connect your page" button (incl. dialog). Hidden for read-only/admin views. */
  connect?: ReactNode;
  /** Server-rendered active-account meta row, when `scope` is a platform with a chosen chip. */
  meta?: ReactNode;
  /** Server-rendered active sub-tab body. */
  body: ReactNode;
}

const SUB_TAB_LABELS: Record<SubTab, string> = {
  overview: "Overview",
  content: "Content",
  timeline: "Timeline",
  audience: "Audience",
  insights: "Insights",
};

export function AccountsWorkspace({
  scope,
  accountId,
  subTab,
  rangeKey,
  accountsByPlatform,
  connect,
  meta,
  body,
}: AccountsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const countsByPlatform = useMemo(() => {
    const out: Partial<Record<PlatformSlug, number>> = {};
    for (const [k, v] of Object.entries(accountsByPlatform)) {
      out[k as PlatformSlug] = v.length;
    }
    return out;
  }, [accountsByPlatform]);

  const isIndividualAccount = scope !== "all" && accountId !== "all";
  const visibleSubTabs: SubTab[] = isIndividualAccount
    ? ["overview", "content", "timeline", "audience", "insights"]
    : scope === "all"
      ? ["overview", "content", "timeline"]
      : ["overview", "content", "timeline", "insights"];

  const activePlatformAccounts = scope !== "all" ? (accountsByPlatform[scope] ?? []) : [];

  function pushParams(updater: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleScopeChange(nextScope: Scope) {
    pushParams((p) => {
      if (nextScope === "all") {
        p.delete("platform");
      } else {
        p.set("platform", nextScope);
      }
      // Reset account selection on every scope change.
      p.delete("account");
      // Audience tab is only valid for an individual account; account just got
      // cleared, so drop it on any scope change.
      if (p.get("tab") === "audience") p.delete("tab");
      // Insights tab isn't valid for the "all" scope.
      if (nextScope === "all" && p.get("tab") === "insights") {
        p.delete("tab");
      }
    });
  }

  function handleAccountChange(nextId: string | "all") {
    pushParams((p) => {
      if (nextId === "all") {
        p.delete("account");
        // Audience tab is only valid for individual accounts.
        if (p.get("tab") === "audience") p.delete("tab");
      } else {
        p.set("account", nextId);
      }
    });
  }

  function handleSubTabChange(next: SubTab) {
    pushParams((p) => {
      if (next === "overview") {
        p.delete("tab");
      } else {
        p.set("tab", next);
      }
    });
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Row 1: Scope tabs + Connect */}
      <div
        className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5 md:py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <ScopeTabs
          active={scope}
          onChange={handleScopeChange}
          countsByPlatform={countsByPlatform}
        />
        {connect ? <div className="shrink-0">{connect}</div> : null}
      </div>

      {/* Row 2: Account chips (hidden when scope=all) */}
      {scope !== "all" ? (
        <div className="border-b px-4 py-3 md:px-5 md:py-2" style={{ borderColor: "var(--border)" }}>
          {activePlatformAccounts.length > 0 ? (
            <AccountChipsRow
              accounts={activePlatformAccounts}
              activeId={accountId}
              onChange={handleAccountChange}
            />
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No {PLATFORM_LABEL[scope]} accounts connected.
            </p>
          )}
        </div>
      ) : null}

      {/* Row 3: Active-account meta (only when an account is picked) */}
      {meta}

      {/* Row 4: Sub-tabs + TimeRangeSelector */}
      <div
        className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 md:py-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="scrollbar-none flex w-full gap-0.5 overflow-x-auto overflow-y-hidden md:w-auto" role="tablist">
          {visibleSubTabs.map((tab) => {
            const isActive = tab === subTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSubTabChange(tab)}
                className="whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {SUB_TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
        <div className="shrink-0 md:py-2">
          <TimeRangeSelector value={rangeKey} />
        </div>
      </div>

      {/* Row 5: Sub-tab body */}
      <div className="px-4 py-4 md:px-5 md:py-5">{body}</div>
    </div>
  );
}
