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
        <Link href={`/admin/campaigns/${campaignId}`} className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
          ← {campaign.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Views", value: totalViews.toLocaleString() },
          { label: "Total Reach", value: totalReach.toLocaleString() },
          { label: "Creator Payouts", value: `$${totalCreatorEarnings.toFixed(2)}` },
          { label: "Platform Revenue", value: `$${totalPlatformRevenue.toFixed(2)}` },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border p-4" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Fraud alert */}
      {fraudCount > 0 && (
        <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "var(--error-bg)", borderColor: "var(--error)", border: "1px solid var(--error)", color: "var(--error-text)" }}>
          {fraudCount} post{fraudCount > 1 ? "s" : ""} flagged as fraud suspect — excluded from earnings calculations.
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border p-6 mb-8" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Views & Reach Over Time</h2>
        <ViewsChart data={chartData} />
      </div>

      {/* Per-post breakdown */}
      <div className="rounded-xl border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div className="px-6 py-4 border-b" style={{ borderBottomColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Post Breakdown</h2>
        </div>
        {postBreakdown.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No posts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottomColor: "var(--border)", borderBottomWidth: "1px" }}>
                <th className="text-left px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Creator</th>
                <th className="text-right px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Views</th>
                <th className="text-right px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Creator Earnings</th>
                <th className="text-right px-6 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Platform Revenue</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: "var(--border)" }}>
              {postBreakdown.map((p: PostBreakdownItem, idx: number) => (
                <tr key={p.id} style={{ borderBottomWidth: idx < postBreakdown.length - 1 ? "1px" : "0", borderBottomColor: "var(--border)" }}>
                  <td className="px-6 py-3">
                    <a
                      href={p.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      {p.creatorName}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    {p.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    ${p.creatorEarnings.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    ${p.platformRevenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTopWidth: "1px", borderTopColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <td className="px-6 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>TOTAL</td>
                <td className="px-6 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                  {totalViews.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                  ${totalCreatorEarnings.toFixed(2)}
                </td>
                <td className="px-6 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
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
