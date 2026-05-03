import { Suspense } from "react";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveEarnings } from "./_components/live-earnings";
import { ScoreCard } from "@/components/clipper-score/score-card";
import { getActivationStatus } from "@/lib/activation";
import { WelcomeHeader } from "./_components/welcome-header";
import { DashboardAlerts } from "./_components/dashboard-alerts";
import { ActivationCard } from "./_components/activation-card";

export default async function DashboardPage() {
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  const userId = header.id;
  const profileId = header.creatorProfile.id;
  const displayName = header.creatorProfile.displayName;

  // All independent — single round-trip to the DB pool
  const [
    earningsResult,
    paidResult,
    activeCampaigns,
    pendingSubmissions,
    igConnections,
    fbConnections,
    ytConnections,
    ttConnections,
    activation,
  ] = await Promise.all([
    prisma.campaignSubmission.aggregate({
      where: { creatorId: userId, status: "APPROVED" },
      _sum: { earnedAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorProfile: { userId }, status: { in: ["confirmed", "sent"] } },
      _sum: { amount: true },
    }),
    prisma.campaignApplication.count({
      where: {
        creatorProfileId: profileId,
        status: { in: ["pending", "approved", "active"] },
      },
    }),
    prisma.campaignSubmission.count({
      where: { creatorId: userId, status: "PENDING" },
    }),
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    getActivationStatus(userId),
  ]);

  const totalEarnings = Number(earningsResult._sum.earnedAmount || 0);
  const totalPaid = Number(paidResult._sum.amount || 0);
  const hasUnpaidBalance = totalEarnings - totalPaid > 0;

  const statusLine = activation.fullyActivated
    ? `${pendingSubmissions} ${pendingSubmissions === 1 ? "clip" : "clips"} awaiting review.`
    : "Finish setup so you can start earning.";

  const platforms = [
    { connected: igConnections.length > 0, verified: igConnections.some(c => c.isVerified) },
    { connected: fbConnections.length > 0, verified: fbConnections.some(c => c.isVerified) },
    { connected: ytConnections.length > 0, verified: ytConnections.some(c => c.isVerified) },
    { connected: ttConnections.length > 0, verified: ttConnections.some(c => c.isVerified) },
  ];
  const connectedCount = platforms.filter(p => p.connected).length;
  const verifiedCount = platforms.filter(p => p.verified).length;
  const allVerified = connectedCount > 0 && verifiedCount === connectedCount;

  return (
    <div className="p-6 space-y-6">
      <WelcomeHeader displayName={displayName} status={statusLine} />

      <DashboardAlerts
        activation={activation}
        hasUnpaidBalance={hasUnpaidBalance}
      />

      <ActivationCard activation={activation} />

      {/* Live Earnings + Performance Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LiveEarnings />
        </div>
        <ScoreCard creatorProfileId={profileId} variant="compact" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Earnings"
          value={`$${Number(totalEarnings).toFixed(2)}`}
          color="#22c55e"
        />
        <StatCard
          label="Active Campaigns"
          value={activeCampaigns.toString()}
          color="#6366F1"
        />
        <StatCard
          label="Pending Submissions"
          value={pendingSubmissions.toString()}
          color="#f59e0b"
        />
        <StatCard
          label="Verified Platforms"
          value={connectedCount === 0 ? "—" : `${verifiedCount}/${connectedCount}`}
          color={connectedCount === 0 ? "#64748b" : allVerified ? "#22c55e" : "#f59e0b"}
        />
      </div>

      {/* Recent Submissions — streamed via Suspense so the stat cards above don't wait */}
      <Suspense fallback={<RecentSubmissionsSkeleton />}>
        <RecentSubmissions creatorId={userId} />
      </Suspense>
    </div>
  );
}

async function RecentSubmissions({ creatorId }: { creatorId: string }) {
  const recentSubmissions = await prisma.campaignSubmission.findMany({
    where: { creatorId },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div
      className="rounded-lg p-6 border"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <h2
        className="text-xl font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Recent Submissions
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr
            style={{ borderBottomColor: "var(--border)", color: "var(--text-secondary)" }}
            className="border-b"
          >
            <th className="text-left py-3 px-4">Campaign</th>
            <th className="text-left py-3 px-4">Claimed Views</th>
            <th className="text-left py-3 px-4">Status</th>
            <th className="text-left py-3 px-4">Earned</th>
          </tr>
        </thead>
        <tbody>
          {recentSubmissions.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-4 px-4 text-center" style={{ color: "var(--text-secondary)" }}>
                No submissions yet
              </td>
            </tr>
          ) : (
            recentSubmissions.map((sub) => (
              <tr
                key={sub.id}
                style={{ borderBottomColor: "var(--border)" }}
                className="border-b"
              >
                <td className="py-3 px-4" style={{ color: "var(--text-primary)" }}>
                  {sub.campaign.name}
                </td>
                <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                  {sub.claimedViews.toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ color: getStatusColor(sub.status), backgroundColor: `${getStatusColor(sub.status)}20` }}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>
                  ${Number(sub.earnedAmount).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecentSubmissionsSkeleton() {
  return (
    <div
      className="rounded-lg p-6 border space-y-3"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <Skeleton className="h-6 w-44 mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function getStatusColor(status: string) {
  if (status === "APPROVED" || status === "active" || status === "verified") return "#22c55e";
  if (status === "PENDING") return "#f59e0b";
  if (status === "REJECTED" || status === "failed") return "#ef4444";
  return "#64748b";
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-6 border"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
        {label}
      </p>
      <p style={{ color, fontSize: "32px" }} className="font-bold">
        {value}
      </p>
    </div>
  );
}
