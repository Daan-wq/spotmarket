"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatNumber } from "@/lib/i18n-format";
import {
  buildCampaignLeaderboardDisplayRows,
  type CampaignLeaderboardSort,
  type RankedCampaignLeaderboardRow,
} from "@/lib/campaign-leaderboard";

interface LeaderboardResponse {
  campaign: { id: string; name: string; creatorCpv: number };
  sort: CampaignLeaderboardSort;
  leaderboard: RankedCampaignLeaderboardRow[];
  currentUserEntry: RankedCampaignLeaderboardRow | null;
  totalClippers: number;
}

export function CampaignLeaderboardClient({ campaignId }: { campaignId: string }) {
  const locale = useLocale();
  const t = useTranslations("creator.campaigns.leaderboard");
  const sharedT = useTranslations("creator.shared");
  const [sort, setSort] = useState<CampaignLeaderboardSort>("views");
  const sortOptions: Array<{ key: CampaignLeaderboardSort; label: string }> = [
    { key: "views", label: sharedT("labels.views") },
    { key: "earnings", label: sharedT("labels.earned") },
    { key: "score", label: t("score") },
  ];

  const { data, isFetching } = useQuery({
    queryKey: ["campaign-leaderboard", campaignId, sort],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const r = await fetch(
        `/api/campaigns/${campaignId}/leaderboard?sort=${sort}`,
        { cache: "no-store" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as LeaderboardResponse;
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = isFetching && !data;
  const displayRows = data
    ? buildCampaignLeaderboardDisplayRows(
        data.leaderboard,
        data.currentUserEntry,
      )
    : [];

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
            {t("topClippers")}
          </span>
          {data && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("ranked", { count: data.totalClippers })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sortOptions.map((opt) => {
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
          {t("loading")}
        </div>
      ) : !data || data.leaderboard.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("empty")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-default)",
                color: "var(--text-muted)",
              }}
            >
              <th className="text-left py-3 px-4 font-medium">#</th>
              <th className="text-left py-3 px-4 font-medium">{t("clipper")}</th>
              <th className="text-left py-3 px-4 font-medium">{sharedT("units.clips")}</th>
              <th className="text-right py-3 px-4 font-medium">{sharedT("labels.views")}</th>
              <th className="text-right py-3 px-4 font-medium">{sharedT("labels.earned")}</th>
              <th className="text-right py-3 px-4 font-medium">{t("score")}</th>
              <th className="text-left py-3 px-4 font-medium">{t("topPost")}</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ row, isCurrentUser, isAdditional }) => (
              <tr
                key={row.creatorId}
                style={{
                  borderBottom: "1px solid var(--border-default)",
                  borderTop: isAdditional
                    ? "2px solid var(--border-default)"
                    : undefined,
                  background: isCurrentUser ? "var(--accent-bg)" : undefined,
                }}
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
                    {isCurrentUser ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--primary)",
                          color: "#FFFFFF",
                        }}
                      >
                        {t("you")}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                  {formatNumber(row.submissionCount, locale)}
                </td>
                <td
                  className="py-3 px-4 text-right tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatNumber(row.totalViews, locale)}
                </td>
                <td
                  className="py-3 px-4 text-right tabular-nums"
                  style={{ color: "var(--success)" }}
                >
                  {formatCurrency(row.totalEarned, locale)}
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
                      {t("viewTopClip")}
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
        </div>
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
