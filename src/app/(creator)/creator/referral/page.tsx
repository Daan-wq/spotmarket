import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReferralLink } from "./_components/referral-link";
import { ReferralEarningsChart } from "./_components/earnings-chart";
import { Leaderboard } from "./_components/leaderboard";
import { ActivityFeed } from "./_components/activity-feed";
import { ReferredUsersTable, type ReferredUserRow } from "./_components/referred-users-table";
import { MilestoneCard } from "./_components/milestone-card";

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

  // Per-referred-user commission breakdown.
  const commissionByReferred = new Map<string, number>();
  for (const p of payouts) {
    commissionByReferred.set(
      p.referredUserId,
      (commissionByReferred.get(p.referredUserId) ?? 0) +
        parseFloat(p.amount.toString()),
    );
  }
  const referredUserRows: ReferredUserRow[] = signups.map((s) => ({
    userId: s.id,
    displayName: s.creatorProfile?.displayName ?? s.email.split("@")[0],
    joinedAt: s.createdAt.toISOString(),
    commissionEarned: commissionByReferred.get(s.id) ?? 0,
  }));
  referredUserRows.sort((a, b) => b.commissionEarned - a.commissionEarned);

  const isEmpty = totalInvited === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Referral Program
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Earn 10% from invited creators&apos; earnings — up to $100 per creator. We pay 110%: creators keep 100%, your 10% is on top.
        </p>
      </div>

      {isEmpty ? (
        // Empty-state hero: prioritize the share link + clear value prop
        <>
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-bg) 0%, var(--bg-card) 100%)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Invite a creator, earn 10% of what they make
            </h2>
            <p className="mx-auto mt-1.5 max-w-xl text-sm" style={{ color: "var(--text-secondary)" }}>
              Share your link below. Every clipper who signs up under it earns
              you 10% of their payouts — up to $100 per creator. They still keep
              100%, our platform covers your share.
            </p>
          </div>

          <ReferralLink referralCode={user.referralCode ?? ""} referralUrl={referralUrl} />
        </>
      ) : (
        <>
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

          {/* Referral Link + Milestone */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReferralLink referralCode={user.referralCode ?? ""} referralUrl={referralUrl} />
            </div>
            <MilestoneCard totalInvited={totalInvited} />
          </div>

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

          {/* Per-referred-user breakdown */}
          <section>
            <h2
              className="text-lg font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Your referrals
            </h2>
            <ReferredUsersTable rows={referredUserRows} />
          </section>

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
        </>
      )}
    </div>
  );
}
