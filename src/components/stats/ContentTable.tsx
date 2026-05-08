"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ClipThumbnail from "@/components/shared/ClipThumbnail";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { relativeTime } from "@/lib/relative-time";
import type { ContentRow } from "@/lib/stats/content";
import { type PlatformSlug } from "@/lib/stats/types";

interface ContentTableProps {
  platform: PlatformSlug;
  rows: ContentRow[];
  showCreator?: boolean;
  /** Adds a "Platform" column. Use when rendering rows from multiple platforms (all-scope). */
  showPlatform?: boolean;
}

interface StatColumn {
  key: string;
  label: string;
  cell: (row: ContentRow) => React.ReactNode;
  sortValue: (row: ContentRow) => number;
}

function num(getter: (r: ContentRow) => number | null | undefined) {
  return (r: ContentRow) => {
    const v = getter(r);
    if (v == null) return <span className="text-neutral-400">—</span>;
    return v.toLocaleString();
  };
}

const PLATFORM_STAT_COLUMNS: Record<PlatformSlug, StatColumn[]> = {
  ig: [
    { key: "views", label: "Views", cell: num((r) => r.views), sortValue: (r) => r.views },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments },
    { key: "shares", label: "Shares", cell: num((r) => r.shares), sortValue: (r) => r.shares },
    { key: "saves", label: "Saves", cell: num((r) => r.saves ?? null), sortValue: (r) => r.saves ?? 0 },
    { key: "reach", label: "Reach", cell: num((r) => r.reach ?? null), sortValue: (r) => r.reach ?? 0 },
    { key: "interactions", label: "Total Int.", cell: num((r) => r.totalInteractions ?? null), sortValue: (r) => r.totalInteractions ?? 0 },
    { key: "follows", label: "Follows", cell: num((r) => r.follows ?? null), sortValue: (r) => r.follows ?? 0 },
    { key: "profileVisits", label: "Profile visits", cell: num((r) => r.profileVisits ?? null), sortValue: (r) => r.profileVisits ?? 0 },
  ],
  tt: [
    { key: "views", label: "Views", cell: num((r) => r.views), sortValue: (r) => r.views },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments },
    { key: "shares", label: "Shares", cell: num((r) => r.shares), sortValue: (r) => r.shares },
  ],
  yt: [
    { key: "views", label: "Views", cell: num((r) => r.views), sortValue: (r) => r.views },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments },
    {
      key: "watchTime",
      label: "Watch (min)",
      cell: (r) => (r.watchTimeSec != null ? Math.round(r.watchTimeSec / 60).toLocaleString() : <span className="text-neutral-400">—</span>),
      sortValue: (r) => r.watchTimeSec ?? 0,
    },
  ],
  fb: [
    { key: "views", label: "Plays", cell: num((r) => r.views), sortValue: (r) => r.views },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments },
    { key: "shares", label: "Shares", cell: num((r) => r.shares), sortValue: (r) => r.shares },
    { key: "watchTime", label: "Watch (s)", cell: num((r) => r.watchTimeSec ?? null), sortValue: (r) => r.watchTimeSec ?? 0 },
    {
      key: "reactions",
      label: "Reactions",
      cell: (r) => {
        const data = (r.extras?.reactionsByType as Record<string, number> | null | undefined) ?? null;
        if (!data) return <span className="text-neutral-400">—</span>;
        const total = Object.values(data).reduce((s, v) => s + (Number(v) || 0), 0);
        return (
          <span title={Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(" · ")}>
            {total.toLocaleString()}
          </span>
        );
      },
      sortValue: (r) => {
        const data = (r.extras?.reactionsByType as Record<string, number> | null | undefined) ?? null;
        if (!data) return 0;
        return Object.values(data).reduce((s, v) => s + (Number(v) || 0), 0);
      },
    },
  ],
};

export function ContentTable({ platform, rows, showCreator, showPlatform }: ContentTableProps) {
  const statCols = PLATFORM_STAT_COLUMNS[platform];
  const [sortKey, setSortKey] = useState<string>(statCols[0]?.key ?? "views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const col = statCols.find((c) => c.key === sortKey);
    if (!col) return rows;
    const out = [...rows].sort((a, b) => col.sortValue(a) - col.sortValue(b));
    return sortDir === "desc" ? out.reverse() : out;
  }, [rows, statCols, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <div className="py-10 text-sm text-neutral-500">
        No posts in this range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th className="w-14 px-2 py-3" aria-label="Preview"></th>
            <th className="px-2 py-3 text-left font-medium">Posted</th>
            <th className="px-2 py-3 text-left font-medium">Campaign</th>
            {showCreator ? (
              <th className="px-2 py-3 text-left font-medium">Creator</th>
            ) : null}
            {showPlatform ? (
              <th className="px-2 py-3 text-left font-medium">Platform</th>
            ) : null}
            {statCols.map((c) => {
              const isSorted = sortKey === c.key;
              return (
                <th
                  key={c.key}
                  className="cursor-pointer px-2 py-3 text-right font-medium select-none"
                  onClick={() => {
                    if (isSorted) {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSortKey(c.key);
                      setSortDir("desc");
                    }
                  }}
                >
                  {c.label}
                  {isSorted && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              );
            })}
            <th className="px-2 py-3 text-right font-medium" aria-label="Open"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const detailHref = `/creator/videos/${row.submissionId}`;
            return (
              <tr
                key={row.submissionId}
                className="cursor-pointer border-b border-neutral-100 transition-colors hover:bg-neutral-50"
              >
                <td className="px-2 py-3">
                  <Link href={detailHref} className="block">
                    <ClipThumbnail
                      thumbnailUrl={row.thumbnailUrl}
                      mediaType={row.mediaType}
                      className="h-10 w-10 shrink-0 rounded-md"
                    />
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={detailHref} className="block text-neutral-600">
                    {relativeTime(row.postedAt ?? row.capturedAt)}
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={detailHref} className="block">
                    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                      {row.campaignName}
                    </span>
                  </Link>
                </td>
                {showCreator ? (
                  <td className="px-2 py-3">
                    <Link href={detailHref} className="block text-neutral-700">
                      {row.creatorDisplayName ?? "—"}
                    </Link>
                  </td>
                ) : null}
                {showPlatform ? (
                  <td className="px-2 py-3">
                    <Link href={detailHref} className="block">
                      {row.platformIcon ? (
                        <PlatformIcon platform={row.platformIcon} size={28} />
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </Link>
                  </td>
                ) : null}
                {statCols.map((c) => (
                  <td key={c.key} className="px-2 py-3 text-right text-neutral-950">
                    <Link href={detailHref} className="block">
                      {c.cell(row)}
                    </Link>
                  </td>
                ))}
                <td className="px-2 py-3 text-right">
                  {row.postUrl ? (
                    <a
                      href={row.postUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 underline-offset-2 hover:text-neutral-950 hover:underline"
                      title="Open post in new tab"
                    >
                      Open
                      <ExternalIcon />
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}
