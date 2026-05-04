import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function CampaignsPage() {
  const { userId } = await requireAuth("advertiser");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { advertiserProfile: { select: { id: true } } },
  });

  if (!user?.advertiserProfile) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Advertiser profile not found.</p>
      </div>
    );
  }

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: user.advertiserProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          applications: true,
          campaignSubmissions: true,
        },
      },
    },
  });

  // Get spent amount and total views for each campaign
  const campaignStats = await Promise.all(
    campaigns.map(async (campaign) => {
      const spentResult = await prisma.campaignSubmission.aggregate({
        where: {
          campaignId: campaign.id,
          status: "APPROVED",
        },
        _sum: { earnedAmount: true },
      });

      const viewsResult = await prisma.campaignSubmission.aggregate({
        where: {
          campaignId: campaign.id,
          status: "APPROVED",
        },
        _sum: { claimedViews: true },
      });

      return {
        spent: spentResult._sum.earnedAmount || 0,
        views: viewsResult._sum.claimedViews || 0,
      };
    })
  );

  const statusColor: Record<string, { bg: string; text: string }> = {
    draft: { bg: "var(--bg-primary)", text: "var(--text-secondary)" },
    pending_payment: { bg: "var(--bg-primary)", text: "var(--text-secondary)" },
    pending_review: { bg: "var(--bg-primary)", text: "var(--text-secondary)" },
    active: { bg: "var(--accent-bg)", text: "var(--accent)" },
    paused: { bg: "var(--bg-primary)", text: "var(--text-secondary)" },
    completed: { bg: "var(--bg-primary)", text: "var(--text-secondary)" },
    cancelled: { bg: "var(--error-bg)", text: "var(--error)" },
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          My Campaigns
        </h1>
        <Link
          href="/advertiser/campaigns/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          Create Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div
          className="p-12 text-center rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
            No campaigns yet. Create your first campaign to start reaching creators.
          </p>
          <Link
            href="/advertiser/campaigns/new"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Name
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Budget
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Spent
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Creators
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Views
                </th>
                <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Deadline
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign, idx) => {
                const stats = campaignStats[idx];
                const colors = statusColor[campaign.status as keyof typeof statusColor] || statusColor.draft;
                return (
                  <tr
                    key={campaign.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: "var(--text-primary)" }}>
                      <Link
                        href={`/advertiser/campaigns/${campaign.id}`}
                        className="hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium capitalize inline-block"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {campaign.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      ${Number(campaign.totalBudget).toLocaleString()}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      ${Number(stats.spent).toLocaleString()}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      {campaign._count.applications}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                      {Number(stats.views).toLocaleString()}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                      {new Date(campaign.deadline).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
