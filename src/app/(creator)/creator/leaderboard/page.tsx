import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LeaderboardEntry {
  rank: number;
  creatorId: string;
  displayName: string;
  earnings: number;
  views: number;
}

async function getLeaderboard(periodDays: number | null): Promise<LeaderboardEntry[]> {
  const whereClause: Record<string, unknown> = { status: "APPROVED" };
  if (periodDays !== null) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    whereClause.createdAt = { gte: since };
  }

  const results = await prisma.campaignSubmission.groupBy({
    by: ["creatorId"],
    where: whereClause,
    _sum: { earnedAmount: true, claimedViews: true },
    orderBy: { _sum: { earnedAmount: "desc" } },
    take: 10,
  });

  const creatorIds = results.map((r) => r.creatorId);
  const users = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, creatorProfile: { select: { displayName: true } } },
  });
  const nameMap = new Map(users.map((u) => [u.id, u.creatorProfile?.displayName ?? "Creator"]));

  return results.map((r, i) => ({
    rank: i + 1,
    creatorId: r.creatorId,
    displayName: nameMap.get(r.creatorId) ?? "Creator",
    earnings: Number(r._sum.earnedAmount ?? 0),
    views: Number(r._sum.claimedViews ?? 0),
  }));
}

export default async function LeaderboardPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, creatorProfile: { select: { displayName: true } } },
  });

  const [today, week, allTime] = await Promise.all([
    getLeaderboard(1),
    getLeaderboard(7),
    getLeaderboard(null),
  ]);

  const userName = user?.creatorProfile?.displayName ?? "Creator";
  const userInitial = userName.charAt(0).toUpperCase();

  // Get personal stats
  const personalRank = (list: LeaderboardEntry[]) => {
    const idx = list.findIndex((e) => e.creatorId === user?.id);
    return idx >= 0 ? `#${idx + 1}` : "#—";
  };
  const personalEarnings = (list: LeaderboardEntry[]) => {
    const entry = list.find((e) => e.creatorId === user?.id);
    return entry ? `$${entry.earnings.toFixed(0)}` : "$0";
  };
  const personalViews = (list: LeaderboardEntry[]) => {
    const entry = list.find((e) => e.creatorId === user?.id);
    return entry ? `${entry.views.toLocaleString()} views` : "0 views";
  };

  return (
    <div className="p-6 w-full">
      {/* Personal Stats Card */}
      <div
        className="rounded-xl p-6 mb-8 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-3"
          style={{ background: "#14b8a6" }}
        >
          {userInitial}
        </div>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>{userName}</h2>

        <div className="overflow-x-auto">
          <table className="w-full max-w-md mx-auto text-sm">
            <thead>
              <tr>
                <th className="py-1 px-3 text-left font-medium" style={{ color: "var(--text-muted)" }}></th>
                <th className="py-1 px-3 font-medium" style={{ color: "var(--text-muted)" }}>Rank</th>
                <th className="py-1 px-3 font-medium" style={{ color: "var(--text-muted)" }}>Earnings</th>
                <th className="py-1 px-3 font-medium" style={{ color: "var(--text-muted)" }}>Views</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Today", list: today },
                { label: "Last 7d", list: week },
                { label: "Overall", list: allTime },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="py-1.5 px-3 text-left font-medium" style={{ color: "var(--text-secondary)" }}>{row.label}</td>
                  <td className="py-1.5 px-3 text-center font-semibold" style={{ color: "var(--text-primary)" }}>{personalRank(row.list)}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: "var(--text-primary)" }}>{personalEarnings(row.list)}</td>
                  <td className="py-1.5 px-3 text-center" style={{ color: "var(--text-primary)" }}>{personalViews(row.list)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Three Column Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LeaderboardColumn title="Today" entries={today} currentUserId={user?.id} />
        <LeaderboardColumn title="Last 7 Days" entries={week} currentUserId={user?.id} />
        <LeaderboardColumn title="All-Time" entries={allTime} currentUserId={user?.id} />
      </div>

      {/* Updated timestamp */}
      <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
        Updated: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}

function LeaderboardColumn({ title, entries, currentUserId }: { title: string; entries: LeaderboardEntry[]; currentUserId?: string }) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>{title}</h3>
      {entries.length === 0 ? (
        <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No data yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isMe = entry.creatorId === currentUserId;
            return (
              <div
                key={entry.creatorId}
                className="flex items-center gap-2.5 p-2 rounded-lg"
                style={{ background: isMe ? "var(--accent-bg)" : "transparent" }}
              >
                <span className="w-6 text-center text-sm font-bold">
                  {entry.rank <= 3 ? medals[entry.rank - 1] : <span style={{ color: "var(--text-muted)" }}>{entry.rank}</span>}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "#14b8a6" }}
                >
                  {entry.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {entry.displayName}
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--success-text)" }}>
                  +${entry.earnings.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
