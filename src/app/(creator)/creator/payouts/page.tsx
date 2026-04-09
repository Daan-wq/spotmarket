import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PayoutsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const [payouts, submissions] = await Promise.all([
    prisma.payout.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaignSubmission.findMany({
      where: { creatorId: user.id, status: "APPROVED" },
      include: { campaign: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Balance calculation
  const totalEarned = submissions.reduce((sum, sub) => sum + Number(sub.earnedAmount), 0);
  const totalPaid = payouts
    .filter((p) => p.status === "confirmed" || p.status === "sent")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalEarned - totalPaid;

  // Group approved submissions by campaign
  const byCampaign: Record<string, { campaignId: string; campaignName: string; totalViews: number; totalEarned: number; count: number }> = {};
  submissions.forEach((sub) => {
    if (!byCampaign[sub.campaignId]) {
      byCampaign[sub.campaignId] = {
        campaignId: sub.campaignId,
        campaignName: sub.campaign.name,
        totalViews: 0,
        totalEarned: 0,
        count: 0,
      };
    }
    byCampaign[sub.campaignId].totalViews += sub.claimedViews;
    byCampaign[sub.campaignId].totalEarned += Number(sub.earnedAmount);
    byCampaign[sub.campaignId].count += 1;
  });
  const earningsByCampaign = Object.values(byCampaign).sort((a, b) => b.totalEarned - a.totalEarned);

  const statusColor = (status: string) => {
    if (status === "confirmed" || status === "sent") return "#22c55e";
    if (status === "processing") return "#f59e0b";
    if (status === "pending") return "#6366f1";
    if (status === "failed") return "#ef4444";
    return "#64748b";
  };

  const cardStyle = {
    background: "var(--bg-card)",
    borderColor: "var(--border)",
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Payouts
      </h1>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-6 border" style={cardStyle}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Total Earned</p>
          <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
            ${totalEarned.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg p-6 border" style={cardStyle}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Total Paid Out</p>
          <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
            ${totalPaid.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg p-6 border" style={cardStyle}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Available Balance</p>
          <p className="text-2xl font-bold" style={{ color: balance > 0 ? "var(--warning)" : "var(--text-secondary)" }}>
            ${balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Earnings by campaign */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Earnings by Campaign
        </h2>
        {earningsByCampaign.length === 0 ? (
          <div className="rounded-lg p-10 text-center border" style={cardStyle}>
            <p style={{ color: "var(--text-secondary)" }}>No approved earnings yet</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={cardStyle}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderBottomColor: "var(--border)", backgroundColor: "rgba(99,102,241,0.05)" }}>
                <tr style={{ color: "var(--text-secondary)" }}>
                  <th className="text-left py-3 px-6">Campaign</th>
                  <th className="text-left py-3 px-6">Submissions</th>
                  <th className="text-left py-3 px-6">Total Views</th>
                  <th className="text-left py-3 px-6">Earned</th>
                </tr>
              </thead>
              <tbody>
                {earningsByCampaign.map((row) => (
                  <tr key={row.campaignId} className="border-b last:border-b-0" style={{ borderBottomColor: "var(--border)" }}>
                    <td className="py-3 px-6" style={{ color: "var(--text-primary)" }}>{row.campaignName}</td>
                    <td className="py-3 px-6" style={{ color: "var(--text-secondary)" }}>{row.count}</td>
                    <td className="py-3 px-6" style={{ color: "var(--text-secondary)" }}>{row.totalViews.toLocaleString()}</td>
                    <td className="py-3 px-6 font-semibold" style={{ color: "var(--success)" }}>
                      ${row.totalEarned.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout history */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Payout History
        </h2>
        {payouts.length === 0 ? (
          <div className="rounded-lg p-10 text-center border" style={cardStyle}>
            <p style={{ color: "var(--text-secondary)" }}>No payouts yet — your balance will be paid out weekly</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={cardStyle}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ borderBottomColor: "var(--border)", backgroundColor: "rgba(99,102,241,0.05)" }}>
                <tr style={{ color: "var(--text-secondary)" }}>
                  <th className="text-left py-3 px-6">Date</th>
                  <th className="text-left py-3 px-6">Amount</th>
                  <th className="text-left py-3 px-6">Type</th>
                  <th className="text-left py-3 px-6">Status</th>
                  <th className="text-left py-3 px-6">Method</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b last:border-b-0" style={{ borderBottomColor: "var(--border)" }}>
                    <td className="py-3 px-6" style={{ color: "var(--text-secondary)" }}>
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-6" style={{ color: "var(--text-primary)" }}>
                      ${Number(payout.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-6" style={{ color: "var(--text-secondary)" }}>
                      {payout.type.charAt(0).toUpperCase() + payout.type.slice(1)}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className="px-3 py-1 rounded text-xs font-medium"
                        style={{ color: statusColor(payout.status), backgroundColor: `${statusColor(payout.status)}20` }}
                      >
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-6" style={{ color: "var(--text-secondary)" }}>
                      {payout.paymentMethod || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
