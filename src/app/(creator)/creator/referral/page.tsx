import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReferralLink } from "./_components/referral-link";
import { ReferralEarningsChart } from "./_components/earnings-chart";
import { Leaderboard } from "./_components/leaderboard";
import { ActivityFeed } from "./_components/activity-feed";

export default async function ReferralPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, referralCode: true, referralEarnings: true },
  });
  if (!user) throw new Error("User not found");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.clipprofit.com";
  const referralUrl = `${baseUrl}/sign-up?ref=${user.referralCode}`;

  // Fetch all data in parallel
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalInvited,
    pendingResult,
    thisMonthResult,
    payouts,
    signups,
    topReferrers,
  ] = await Promise.all([
    prisma.user.count({ where: { referredBy: user.id } }),
    prisma.referralPayout.aggregate({
      where: { referrerId: user.id, status: "pending" },
      _sum: { amount: true },
    }),
    prisma.referralPayout.aggregate({
      where: { referrerId: user.id, createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.referralPayout.findMany({
      where: { referrerId: user.id, createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true, referredUserId: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { referredBy: user.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        creatorProfile: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { referralEarnings: { gt: 0 }, role: "creator" },
      select: {
        id: true,
        referralEarnings: true,
        creatorProfile: { select: { displayName: true } },
      },
      orderBy: { referralEarnings: "desc" },
      take: 10,
    }),
  ]);

  // Stats
  const totalEarnings = parseFloat(user.referralEarnings.toString());
  const pendingEarnings = parseFloat(pendingResult._sum.amount?.toString() ?? "0");
  const thisMonthEarnings = parseFloat(thisMonthResult._sum.amount?.toString() ?? "0");

  // Earnings chart data (monthly)
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, 0);
  }
  for (const p of payouts) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + parseFloat(p.amount.toString()));
  }
  const chartData = Array.from(monthlyMap.entries()).map(([month, earnings]) => ({
    month,
    earnings: Math.round(earnings * 100) / 100,
  }));

  // Leaderboard
  const referredUserMap = new Map(signups.map((s) => [s.id, s.creatorProfile?.displayName ?? s.email.split("@")[0]]));

  const referrerIds = topReferrers.map((r) => r.id);
  const referralCounts = await prisma.user.groupBy({
    by: ["referredBy"],
    where: { referredBy: { in: referrerIds } },
    _count: { id: true },
  });
  const countMap = new Map(referralCounts.map((r) => [r.referredBy, r._count.id]));

  const leaderboardEntries = topReferrers.map((r, i) => ({
    rank: i + 1,
    displayName: r.creatorProfile?.displayName ?? "Anonymous",
    totalEarnings: parseFloat(r.referralEarnings.toString()),
    referralCount: countMap.get(r.id) ?? 0,
    isCurrentUser: r.id === user.id,
  }));

  let currentUserRank: number | null = null;
  if (!leaderboardEntries.some((e) => e.isCurrentUser) && totalEarnings > 0) {
    const higherCount = await prisma.user.count({
      where: {
        referralEarnings: { gt: user.referralEarnings },
        role: "creator",
      },
    });
    currentUserRank = higherCount + 1;
  }

  // Activity feed (merged signups + earnings, sorted by date)
  type ActivityItem = {
    type: "signup" | "earning";
    timestamp: string;
    referredUserName: string;
    amount?: number;
    status?: string;
  };
  const activities: ActivityItem[] = [
    ...signups.map((s) => ({
      type: "signup" as const,
      timestamp: s.createdAt.toISOString(),
      referredUserName: s.creatorProfile?.displayName ?? s.email.split("@")[0],
    })),
    ...payouts.map((p) => ({
      type: "earning" as const,
      timestamp: p.createdAt.toISOString(),
      referredUserName: referredUserMap.get(p.referredUserId) ?? "Unknown",
      amount: parseFloat(p.amount.toString()),
      status: p.status,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const stats = [
    { label: "People Invited", value: totalInvited.toString(), color: "#6366f1" },
    { label: "Total Earned", value: `$${totalEarnings.toFixed(2)}`, color: "#22c55e" },
    { label: "Pending", value: `$${pendingEarnings.toFixed(2)}`, color: "#f59e0b" },
    { label: "This Month", value: `$${thisMonthEarnings.toFixed(2)}`, color: "#3b82f6" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Referral Program
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Earn 10% from invited creators' earnings — up to $100 per creator. We pay 110%: creators keep 100%, your 10% is on top.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-6 border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
              {stat.label}
            </p>
            <p style={{ color: stat.color, fontSize: "32px" }} className="font-bold">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Referral Link */}
      <ReferralLink referralCode={user.referralCode ?? ""} referralUrl={referralUrl} />

      {/* Chart + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Earnings Over Time
          </h2>
          <ReferralEarningsChart data={chartData} />
        </div>

        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Top Referrers
          </h2>
          <Leaderboard entries={leaderboardEntries} currentUserRank={currentUserRank} />
        </div>
      </div>

      {/* Activity Feed */}
      <div
        className="rounded-lg p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Recent Activity
        </h2>
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
