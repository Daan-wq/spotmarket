interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalEarnings: number;
  referralCount: number;
  isCurrentUser: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
}

export async function Leaderboard({ entries, currentUserRank }: LeaderboardProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.referral.leaderboard");

  if (entries.length === 0) {
    return (
      <div
        className="h-48 flex items-center justify-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.rank}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
          style={{
            background: entry.isCurrentUser ? "var(--accent-bg, rgba(0,210,106,0.1))" : "var(--bg-primary)",
            border: entry.isCurrentUser ? "1px solid var(--accent)" : "1px solid transparent",
          }}
        >
          <span
            className="text-sm font-bold w-6 text-center"
            style={{
              color: entry.rank <= 3 ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {entry.rank}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {entry.displayName}
              {entry.isCurrentUser && (
                <span className="ml-2 text-xs" style={{ color: "var(--accent)" }}>({t("you")})</span>
              )}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("referrals")}: {formatNumber(entry.referralCount, locale)}
            </p>
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {formatCurrency(entry.totalEarnings, locale)}
          </span>
        </div>
      ))}
      {currentUserRank && !entries.some((e) => e.isCurrentUser) && (
        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          {t("yourRank", { rank: currentUserRank })}
        </p>
      )}
    </div>
  );
}
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatNumber } from "@/lib/i18n-format";
import { getLocale, getTranslations } from "next-intl/server";
