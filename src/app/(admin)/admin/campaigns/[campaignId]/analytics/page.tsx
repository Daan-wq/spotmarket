import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ViewsChart } from "@/components/analytics/views-chart";

type PostBreakdownItem = {
  id: string;
  postUrl: string;
  creatorName: string;
  views: number;
  creatorEarnings: number;
  platformRevenue: number;
};

async function getCampaignAnalytics(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, creatorCpv: true, adminMargin: true, businessCpv: true },
  });
  if (!campaign) return null;

  const snapshots = await prisma.viewSnapshot.findMany({
    where: { post: { application: { campaignId } } },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, viewsCount: true, reach: true, postId: true },
  });

  // Aggregate by day
  const byDay: Record<string, { views: number; reach: number }> = {};
  for (const s of snapshots) {
    const day = s.capturedAt.toISOString().substring(0, 10);
    if (!byDay[day]) byDay[day] = { views: 0, reach: 0 };
    byDay[day].views += s.viewsCount;
    byDay[day].reach += s.reach ?? 0;
  }

  const chartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }));

  const totalViews = chartData.reduce((sum, d) => sum + d.views, 0);
  const totalReach = chartData.reduce((sum, d) => sum + d.reach, 0);

  // Per-post breakdown
  const posts = await prisma.campaignPost.findMany({
    where: { application: { campaignId }, isFraudSuspect: false },
    include: {
      snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      application: {
        include: { creatorProfile: { select: { displayName: true } } },
      },
    },
  });

  const creatorCpv = parseFloat(campaign.creatorCpv.toString());
  const adminMarginCpv = parseFloat(campaign.adminMargin.toString());

  const postBreakdown = posts
    .filter((p) => p.application.creatorProfile !== null)
    .map((p: typeof posts[number]) => {
      const latestViews = p.snapshots[0]?.viewsCount ?? 0;
      return {
        id: p.id,
        postUrl: p.postUrl,
        creatorName: p.application.creatorProfile!.displayName,
        views: latestViews,
        creatorEarnings: latestViews * creatorCpv,
        platformRevenue: latestViews * adminMarginCpv,
      };
    });

  const totalCreatorEarnings = postBreakdown.reduce((s: number, p: { creatorEarnings: number }) => s + p.creatorEarnings, 0);
  const totalPlatformRevenue = postBreakdown.reduce((s: number, p: { platformRevenue: number }) => s + p.platformRevenue, 0);

  const fraudCount = await prisma.campaignPost.count({
    where: { application: { campaignId }, isFraudSuspect: true },
  });

  return {
    campaign,
    chartData,
    totalViews,
    totalReach,
    postBreakdown,
    totalCreatorEarnings,
    totalPlatformRevenue,
    fraudCount,
  };
}

export default async function AdminCampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const data = await getCampaignAnalytics(campaignId);
  if (!data) notFound();

  const { campaign, chartData, totalViews, totalReach, postBreakdown,
          totalCreatorEarnings, totalPlatformRevenue, fraudCount } = data;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/admin/campaigns/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {campaign.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Views", value: totalViews.toLocaleString() },
          { label: "Total Reach", value: totalReach.toLocaleString() },
          { label: "Creator Payouts", value: `$${totalCreatorEarnings.toFixed(2)}` },
          { label: "Platform Revenue", value: `$${totalPlatformRevenue.toFixed(2)}` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Fraud alert */}
      {fraudCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {fraudCount} post{fraudCount > 1 ? "s" : ""} flagged as fraud suspect — excluded from earnings calculations.
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Views & Reach Over Time</h2>
        <ViewsChart data={chartData} />
      </div>

      {/* Per-post breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Post Breakdown</h2>
        </div>
        {postBreakdown.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No posts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Creator</th>
                <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">Views</th>
                <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">Creator Earnings</th>
                <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">Platform Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {postBreakdown.map((p: PostBreakdownItem) => (
                <tr key={p.id}>
                  <td className="px-6 py-3">
                    <a
                      href={p.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {p.creatorName}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    {p.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    ${p.creatorEarnings.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    ${p.platformRevenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-6 py-3 text-xs font-semibold text-gray-500">TOTAL</td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">
                  {totalViews.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">
                  ${totalCreatorEarnings.toFixed(2)}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">
                  ${totalPlatformRevenue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
