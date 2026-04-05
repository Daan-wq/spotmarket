import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EarningsPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  // Get all approved submissions grouped by campaign
  const submissions = await prisma.campaignSubmission.findMany({
    where: { creatorId: user.id, status: "APPROVED" },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Group by campaign
  const earnings: { [key: string]: { campaignId: string; campaignName: string; totalViews: number; totalEarned: number; count: number } } = {};
  let grandTotal = 0;

  submissions.forEach((sub) => {
    const key = sub.campaignId;
    if (!earnings[key]) {
      earnings[key] = {
        campaignId: sub.campaignId,
        campaignName: sub.campaign.name,
        totalViews: 0,
        totalEarned: 0,
        count: 0,
      };
    }
    earnings[key].totalViews += sub.claimedViews;
    earnings[key].totalEarned += Number(sub.earnedAmount);
    earnings[key].count += 1;
    grandTotal += Number(sub.earnedAmount);
  });

  const earningsList = Object.values(earnings).sort((a, b) => b.totalEarned - a.totalEarned);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Earnings
      </h1>

      {/* Total Card */}
      <div
        className="rounded-lg p-6 border mb-6"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <p style={{ color: "var(--text-secondary)" }} className="text-sm">
          Total Earned (Approved Submissions)
        </p>
        <p
          style={{ color: "var(--success)" }}
          className="text-4xl font-bold"
        >
          ${grandTotal.toFixed(2)}
        </p>
      </div>

      {/* Earnings by Campaign */}
      {earningsList.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            No approved earnings yet
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <table className="w-full text-sm">
            <thead
              style={{
                borderBottomColor: "var(--border)",
                backgroundColor: "rgba(99, 102, 241, 0.05)",
              }}
              className="border-b"
            >
              <tr style={{ color: "var(--text-secondary)" }}>
                <th className="text-left py-4 px-6">Campaign</th>
                <th className="text-left py-4 px-6">Submissions</th>
                <th className="text-left py-4 px-6">Total Views</th>
                <th className="text-left py-4 px-6">Total Earned</th>
              </tr>
            </thead>
            <tbody>
              {earningsList.map((item) => (
                <tr
                  key={item.campaignId}
                  style={{ borderBottomColor: "var(--border)" }}
                  className="border-b last:border-b-0 hover:bg-opacity-50 transition-colors"
                >
                  <td className="py-4 px-6" style={{ color: "var(--text-primary)" }}>
                    {item.campaignName}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {item.count}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {item.totalViews.toLocaleString()}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--success)" }}>
                    <span className="font-semibold">${item.totalEarned.toFixed(2)}</span>
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
