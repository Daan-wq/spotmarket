import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdvertiserDashboardPage() {
  const { userId } = await requireAuth("advertiser");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, advertiserProfile: { select: { id: true } } },
  });

  if (!user?.advertiserProfile) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Advertiser profile not found.</p>
      </div>
    );
  }

  const advertiserId = user.advertiserProfile.id;

  // Get campaign stats
  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId },
    select: { id: true },
  });

  const campaignIds = campaigns.map((c) => c.id);

  // Total spend (sum of approved submission earnedAmount)
  const totalSpendResult = await prisma.campaignSubmission.aggregate({
    where: {
      campaignId: { in: campaignIds },
      status: "APPROVED",
    },
    _sum: { earnedAmount: true },
  });

  const totalSpend = totalSpendResult._sum.earnedAmount || 0;

  // Active campaigns count
  const activeCampaignsCount = await prisma.campaign.count({
    where: {
      advertiserId,
      status: "active",
    },
  });

  // Total creators (unique across applications)
  const totalCreators = await prisma.campaignApplication.findMany({
    where: { campaignId: { in: campaignIds } },
    distinct: ["creatorProfileId"],
    select: { creatorProfileId: true },
  });

  // Total views (sum of approved claimedViews)
  const totalViewsResult = await prisma.campaignSubmission.aggregate({
    where: {
      campaignId: { in: campaignIds },
      status: "APPROVED",
    },
    _sum: { claimedViews: true },
  });

  const totalViews = totalViewsResult._sum.claimedViews || 0;

  // Pending submissions (last 10)
  const pendingSubmissions = await prisma.campaignSubmission.findMany({
    where: {
      campaignId: { in: campaignIds },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      application: {
        select: {
          creatorProfile: {
            select: { displayName: true },
          },
        },
      },
      campaign: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--text-primary)" }}>
        Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        {[
          { label: "Total Spend", value: `$${Number(totalSpend).toLocaleString()}` },
          { label: "Active Campaigns", value: activeCampaignsCount },
          { label: "Total Creators", value: totalCreators.length },
          { label: "Total Views", value: Number(totalViews).toLocaleString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pending Submissions */}
      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Pending Submissions
        </h2>

        {pendingSubmissions.length === 0 ? (
          <div
            className="p-8 text-center rounded-xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <p style={{ color: "var(--text-muted)" }}>No pending submissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                  <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Claimed Views
                  </th>
                  <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Date
                  </th>
                  <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      {submission.application.creatorProfile?.displayName || "Unknown"}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      {submission.campaign.name}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      {submission.claimedViews.toLocaleString()}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/advertiser/campaigns/${submission.campaignId}`}
                        className="text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ color: "var(--accent)" }}
                      >
                        Review
                      </Link>
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
