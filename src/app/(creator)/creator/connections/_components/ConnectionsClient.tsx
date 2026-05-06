"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import PlatformTabs, {
  type ConnectionPlatform,
} from "@/components/shared/connections/PlatformTabs";
import AccountSwitcher from "@/components/shared/connections/AccountSwitcher";

export interface ConnectionAccount {
  id: string;
  label: string;
  username: string;
  meta: string;
  lastSyncedAt: string | null; // ISO string for client serialization
  statsHref?: string;
  /** Pre-rendered disconnect button (RemovePageButton variant per platform). */
  remove: ReactNode;
}

interface Props {
  accountsByPlatform: Record<ConnectionPlatform, ConnectionAccount[]>;
  connect: ReactNode;
}

const PLATFORM_LABEL: Record<ConnectionPlatform, string> = {
  ig: "Instagram",
  tt: "TikTok",
  fb: "Facebook",
  yt: "YouTube",
};

const ALL_PLATFORMS: ConnectionPlatform[] = ["ig", "tt", "fb", "yt"];

export function ConnectionsClient({ accountsByPlatform, connect }: Props) {
  const totalCount = useMemo(
    () =>
      ALL_PLATFORMS.reduce(
        (sum, p) => sum + (accountsByPlatform[p]?.length ?? 0),
        0,
      ),
    [accountsByPlatform],
  );

  const platformsWithAccounts = useMemo(
    () => ALL_PLATFORMS.filter((p) => (accountsByPlatform[p]?.length ?? 0) > 0),
    [accountsByPlatform],
  );

  const defaultPlatform: ConnectionPlatform =
    platformsWithAccounts[0] ?? "ig";
  const [activePlatform, setActivePlatform] =
    useState<ConnectionPlatform>(defaultPlatform);

  const activeAccounts = accountsByPlatform[activePlatform] ?? [];
  const [activeAccountId, setActiveAccountId] = useState<string>(
    activeAccounts[0]?.id ?? "",
  );

  // Re-derive activeAccountId when platform changes and current id no longer applies.
  const resolvedActiveAccountId =
    activeAccounts.find((a) => a.id === activeAccountId)?.id ??
    activeAccounts[0]?.id ??
    "";

  const handlePlatformChange = (p: ConnectionPlatform) => {
    setActivePlatform(p);
    const first = accountsByPlatform[p]?.[0];
    setActiveAccountId(first?.id ?? "");
  };

  const activeAccount = activeAccounts.find(
    (a) => a.id === resolvedActiveAccountId,
  );

  if (totalCount === 0) {
    return (
      <EmptyState
        title="No pages connected yet"
        description="Use the connect button above to choose a platform and add the first page."
        className="min-h-[220px]"
      />
    );
  }

  return (
    <div
      className="rounded-lg border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Platform tabs row */}
      <div
        className="flex items-center justify-between gap-3 border-b px-5 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <PlatformTabs
          platforms={ALL_PLATFORMS}
          active={activePlatform}
          onChange={handlePlatformChange}
        />
        <div className="shrink-0">{connect}</div>
      </div>

      {/* Account chips row */}
      <div
        className="flex items-center gap-3 border-b px-5 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        {activeAccounts.length > 0 ? (
          <AccountSwitcher
            accounts={activeAccounts.map((a) => ({
              id: a.id,
              username: a.username,
            }))}
            activeId={resolvedActiveAccountId}
            onChange={setActiveAccountId}
          />
        ) : (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No {PLATFORM_LABEL[activePlatform]} accounts connected.
          </p>
        )}
      </div>

      {/* Active account detail */}
      <div className="px-5 py-4">
        {activeAccount ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {activeAccount.label}
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {activeAccount.meta} · last synced{" "}
                {formatSync(activeAccount.lastSyncedAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {activeAccount.statsHref ? (
                <Link
                  href={activeAccount.statsHref}
                  className="inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                    background: "transparent",
                  }}
                >
                  Stats →
                </Link>
              ) : null}
              {activeAccount.remove}
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Connect a {PLATFORM_LABEL[activePlatform]} account to start tracking.
          </p>
        )}
      </div>
    </div>
  );
}

function formatSync(value: string | null) {
  if (!value) return "never";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
