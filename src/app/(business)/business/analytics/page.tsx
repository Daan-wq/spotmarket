import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { EarningsChart } from "@/components/dashboard/earnings-chart";

export default async function BusinessAnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      businessProfile: {
        include: {
          campaigns: {
            include: {
              applications: {
                where: { status: { in: ["approved", "active", "completed"] } },
                include: {
                  posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.businessProfile) redirect("/onboarding");

  const campaigns = user.businessProfile.campaigns;

  const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.totalBudget), 0);
  const totalViews = campaigns.reduce((sum, c) => {
    return sum + c.applications.reduce((s, app) => {
      return s + app.posts.reduce((ps, post) => ps + (post.snapshots[0]?.viewsCount ?? 0), 0);
    }, 0);
  }, 0);
  const avgCpv = totalViews > 0 ? totalSpend / totalViews : 0;
  const activeCreators = new Set(
    campaigns.flatMap((c) => c.applications.map((a) => a.creatorProfileId))
  ).size;

  // Chart data: spend per campaign
  const chartData = campaigns
    .filter((c) => c.status !== "draft" && c.status !== "cancelled")
    .map((c) => {
      const views = c.applications.reduce((s, app) => {
        return s + app.posts.reduce((ps, post) => ps + (post.snapshots[0]?.viewsCount ?? 0), 0);
      }, 0);
      return {
        label: c.name.length > 12 ? c.name.slice(0, 12) + "..." : c.name,
        earned: Number(c.totalBudget),
        views,
      };
    });

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Campaign performance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Spend" value={`$${totalSpend.toLocaleString()}`} />
        <StatCard
          label="Total Views"
          value={totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews)}
        />
        <StatCard label="Avg CPV" value={avgCpv > 0 ? `$${avgCpv.toFixed(4)}` : "--"} />
        <StatCard label="Creators" value={String(activeCreators)} />
      </div>

      {/* Chart */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#111827" }}>
          Budget by Campaign
        </h2>
        <EarningsChart data={chartData} />
      </div>
    </div>
  );
}
