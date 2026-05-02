import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LiveEarnings } from "./_components/live-earnings";
import { ScoreCard } from "@/components/clipper-score/score-card";

export default async function DashboardPage() {
  const { userId } = await requireAuth("creator");

  // Get user and profile
  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  // Get stats
  const earningsResult = await prisma.campaignSubmission.aggregate({
    where: { creatorId: user.id, status: "APPROVED" },
    _sum: { earnedAmount: true },
  });
  const totalEarnings = earningsResult._sum.earnedAmount || 0;

  const activeCampaigns = await prisma.campaignApplication.count({
    where: {
      creatorProfileId: profile.id,
      status: { in: ["pending", "approved", "active"] },
    },
  });

  const pendingSubmissions = await prisma.campaignSubmission.count({
    where: { creatorId: user.id, status: "PENDING" },
  });

  const [igConnections, fbConnections, ytConnections, ttConnections] = await Promise.all([
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId: profile.id }, select: { isVerified: true } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId: profile.id }, select: { isVerified: true } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId: profile.id }, select: { isVerified: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId: profile.id }, select: { isVerified: true } }),
  ]);

  const platforms = [
    { connected: igConnections.length > 0, verified: igConnections.some(c => c.isVerified) },
    { connected: fbConnections.length > 0, verified: fbConnections.some(c => c.isVerified) },
    { connected: ytConnections.length > 0, verified: ytConnections.some(c => c.isVerified) },
    { connected: ttConnections.length > 0, verified: ttConnections.some(c => c.isVerified) },
  ];
  const connectedCount = platforms.filter(p => p.connected).length;
  const verifiedCount = platforms.filter(p => p.verified).length;
  const allVerified = connectedCount > 0 && verifiedCount === connectedCount;

  // Recent submissions
  const recentSubmissions = await prisma.campaignSubmission.findMany({
    where: { creatorId: user.id },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const getStatusColor = (status: string) => {
    if (status === "APPROVED" || status === "active" || status === "verified") return "#22c55e";
    if (status === "PENDING") return "#f59e0b";
    if (status === "REJECTED" || status === "failed") return "#ef4444";
    return "#64748b";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Creator Dashboard
      </h1>

      {/* Live Earnings + Performance Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LiveEarnings />
        </div>
        <ScoreCard creatorProfileId={profile.id} variant="compact" />
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

      {/* Recent Submissions */}
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
    </div>
  );
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
