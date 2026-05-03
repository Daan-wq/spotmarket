"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ContentRow } from "@/lib/stats/content";
import type { PlatformSlug } from "@/lib/stats/types";

interface ContentTableProps {
  platform: PlatformSlug;
  rows: ContentRow[];
  showCreator?: boolean;
}

interface ColumnDef {
  key: string;
  label: string;
  cell: (row: ContentRow) => React.ReactNode;
  sortValue?: (row: ContentRow) => number;
  align?: "left" | "right";
}

const TITLE_COL: ColumnDef = {
  key: "title",
  label: "Post",
  cell: (r) => (
    <a
      href={r.postUrl || "#"}
      target="_blank"
      rel="noreferrer"
      className="hover:underline"
      style={{ color: "var(--text-primary)" }}
    >
      {truncate(r.title, 40)}
    </a>
  ),
};

function num(getter: (r: ContentRow) => number | null | undefined): ColumnDef["cell"] {
  return (r) => {
    const v = getter(r);
    if (v == null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
    return v.toLocaleString();
  };
}

const COMMON_NUM_KEYS = ["views", "likes", "comments", "shares"] as const;

const PLATFORM_COLUMNS: Record<PlatformSlug, ColumnDef[]> = {
  ig: [
    TITLE_COL,
    { key: "views", label: "Views", cell: num((r) => r.views), sortValue: (r) => r.views, align: "right" },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes, align: "right" },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments, align: "right" },
    { key: "shares", label: "Shares", cell: num((r) => r.shares), sortValue: (r) => r.shares, align: "right" },
    { key: "saves", label: "Saves", cell: num((r) => r.saves ?? null), sortValue: (r) => r.saves ?? 0, align: "right" },
    { key: "reach", label: "Reach", cell: num((r) => r.reach ?? null), sortValue: (r) => r.reach ?? 0, align: "right" },
    { key: "interactions", label: "Total Int.", cell: num((r) => r.totalInteractions ?? null), sortValue: (r) => r.totalInteractions ?? 0, align: "right" },
    { key: "follows", label: "Follows", cell: num((r) => r.follows ?? null), sortValue: (r) => r.follows ?? 0, align: "right" },
    { key: "profileVisits", label: "Profile visits", cell: num((r) => r.profileVisits ?? null), sortValue: (r) => r.profileVisits ?? 0, align: "right" },
  ],
  tt: [
    TITLE_COL,
    { key: "views", label: "Views", cell: num((r) => r.views), sortValue: (r) => r.views, align: "right" },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes, align: "right" },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments, align: "right" },
    { key: "shares", label: "Shares", cell: num((r) => r.shares), sortValue: (r) => r.shares, align: "right" },
  ],
  yt: [
    TITLE_COL,
    { key: "views", label: "Views", cell: num((r) => r.views), sortValue: (r) => r.views, align: "right" },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes, align: "right" },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments, align: "right" },
    { key: "watchTime", label: "Watch time (min)", cell: (r) => r.watchTimeSec != null ? Math.round(r.watchTimeSec / 60).toLocaleString() : "—", sortValue: (r) => r.watchTimeSec ?? 0, align: "right" },
  ],
  fb: [
    TITLE_COL,
    { key: "views", label: "Plays", cell: num((r) => r.views), sortValue: (r) => r.views, align: "right" },
    { key: "likes", label: "Likes", cell: num((r) => r.likes), sortValue: (r) => r.likes, align: "right" },
    { key: "comments", label: "Comments", cell: num((r) => r.comments), sortValue: (r) => r.comments, align: "right" },
    { key: "shares", label: "Shares", cell: num((r) => r.shares), sortValue: (r) => r.shares, align: "right" },
    { key: "watchTime", label: "Watch (s)", cell: num((r) => r.watchTimeSec ?? null), sortValue: (r) => r.watchTimeSec ?? 0, align: "right" },
    {
      key: "reactions",
      label: "Reactions",
      cell: (r) => {
        const data = (r.extras?.reactionsByType as Record<string, number> | null | undefined) ?? null;
        if (!data) return <span style={{ color: "var(--text-muted)" }}>—</span>;
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
      align: "right",
    },
  ],
};

export function ContentTable({ platform, rows, showCreator }: ContentTableProps) {
  const cols = useMemo(() => {
    const base = PLATFORM_COLUMNS[platform];
    if (!showCreator) return base;
    const creatorCol: ColumnDef = {
      key: "creator",
      label: "Creator",
      cell: (r) => r.creatorDisplayName ?? "—",
    };
    return [creatorCol, ...base];
  }, [platform, showCreator]);

  const [sortKey, setSortKey] = useState<string>(COMMON_NUM_KEYS[0]);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const sortFn = col.sortValue;
    const out = [...rows].sort((a, b) => sortFn(a) - sortFn(b));
    return sortDir === "desc" ? out.reverse() : out;
  }, [rows, cols, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No posts in this range.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {cols.map((c) => {
                const sortable = !!c.sortValue;
                const isSorted = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    className="text-xs font-semibold uppercase tracking-wide py-3 px-3"
                    style={{
                      color: "var(--text-muted)",
                      textAlign: c.align ?? "left",
                      cursor: sortable ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (!sortable) return;
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
              <th className="py-3 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.submissionId} className="hover:bg-opacity-30" style={{ borderBottom: "1px solid var(--border)" }}>
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className="py-2.5 px-3"
                    style={{
                      color: "var(--text-primary)",
                      textAlign: c.align ?? "left",
                    }}
                  >
                    {c.cell(row)}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right">
                  <Link
                    href={`/creator/videos/${row.submissionId}`}
                    className="text-xs underline"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
