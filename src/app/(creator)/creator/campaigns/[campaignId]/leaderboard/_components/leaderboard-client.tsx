"use client";

import { useEffect, useState } from "react";

type Sort = "views" | "earnings" | "score";

interface LeaderboardRow {
  rank: number;
  creatorId: string;
  creatorProfileId: string | null;
  displayName: string;
  avatarUrl: string | null;
  submissionCount: number;
  totalViews: number;
  totalEarned: number;
  bestPostUrl: string | null;
  bestPostViews: number;
  score: number | null;
}

interface LeaderboardResponse {
  campaign: { id: string; name: string; creatorCpv: number };
  sort: Sort;
  leaderboard: LeaderboardRow[];
  totalClippers: number;
}

const SORT_OPTIONS: Array<{ key: Sort; label: string }> = [
  { key: "views", label: "Views" },
  { key: "earnings", label: "Earnings" },
  { key: "score", label: "Score" },
];

export function CampaignLeaderboardClient({ campaignId }: { campaignId: string }) {
  const [sort, setSort] = useState<Sort>("views");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}/leaderboard?sort=${sort}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: LeaderboardResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, sort]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Top clippers
          </span>
          {data && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {data.totalClippers} ranked
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className="text-xs px-2.5 py-1 rounded-md cursor-pointer"
                style={{
                  background: active ? "var(--primary)" : "transparent",
                  color: active ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Loading leaderboard…
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No approved clippers on this campaign yet.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Be the first — submit a clip to claim the top spot.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-default)",
                color: "var(--text-muted)",
              }}
            >
              <th className="text-left py-3 px-4 font-medium">#</th>
              <th className="text-left py-3 px-4 font-medium">Clipper</th>
              <th className="text-left py-3 px-4 font-medium">Clips</th>
              <th className="text-right py-3 px-4 font-medium">Views</th>
              <th className="text-right py-3 px-4 font-medium">Earned</th>
              <th className="text-right py-3 px-4 font-medium">Score</th>
              <th className="text-left py-3 px-4 font-medium">Top post</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((row) => (
              <tr
                key={row.creatorId}
                style={{ borderBottom: "1px solid var(--border-default)" }}
              >
                <td className="py-3 px-4">
                  <RankCell rank={row.rank} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Avatar url={row.avatarUrl} name={row.displayName} />
                    <span style={{ color: "var(--text-primary)" }}>
                      {row.displayName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                  {row.submissionCount}
                </td>
                <td
                  className="py-3 px-4 text-right tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.totalViews.toLocaleString()}
                </td>
                <td
                  className="py-3 px-4 text-right tabular-nums"
                  style={{ color: "var(--success)" }}
                >
                  ${row.totalEarned.toFixed(2)}
                </td>
                <td
                  className="py-3 px-4 text-right tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.score === null ? (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  ) : (
                    Math.round(row.score)
                  )}
                </td>
                <td className="py-3 px-4">
                  {row.bestPostUrl ? (
                    <a
                      href={row.bestPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline truncate inline-block max-w-[200px] align-middle"
                      style={{ color: "var(--primary)" }}
                    >
                      View top clip
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  const trophy = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  if (trophy) return <span className="text-base">{trophy}</span>;
  return (
    <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
      #{rank}
    </span>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} width={28} height={28} className="rounded-full object-cover" style={{ width: 28, height: 28 }} />;
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-bold"
      style={{
        width: 28,
        height: 28,
        background: "var(--accent-bg, rgba(99,102,241,0.15))",
        color: "var(--accent, #6366F1)",
      }}
    >
      {initials}
    </div>
  );
}
