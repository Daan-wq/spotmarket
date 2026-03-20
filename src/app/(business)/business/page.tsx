import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function BusinessDashboardPage() {
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
              _count: { select: { applications: true } },
              applications: {
                where: { status: { in: ["approved", "active"] } },
                include: {
                  posts: {
                    include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user?.businessProfile) redirect("/onboarding");

  const campaigns = user.businessProfile.campaigns;
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalApplications = campaigns.reduce((sum, c) => sum + c._count.applications, 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.totalBudget), 0);
  const totalViews = campaigns.reduce((sum, c) => {
    return sum + c.applications.reduce((s, app) => {
      return s + app.posts.reduce((ps, post) => ps + (post.snapshots[0]?.viewsCount ?? 0), 0);
    }, 0);
  }, 0);

  const statusStyle: Record<string, { bg: string; color: string }> = {
    active:    { bg: "#f0fdf4", color: "#15803d" },
    draft:     { bg: "#f3f4f6", color: "#6b7280" },
    paused:    { bg: "#fffbeb", color: "#b45309" },
    completed: { bg: "#eff6ff", color: "#1d4ed8" },
    cancelled: { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>
            {user.businessProfile.companyName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Business Dashboard
          </p>
        </div>
        <Link
          href="/business/campaigns/new"
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          + New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Campaigns" value={String(activeCampaigns.length)} />
        <StatCard label="Total Applications" value={String(totalApplications)} />
        <StatCard
          label="Total Budget"
          value={`$${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Total Views"
          value={totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews)}
        />
      </div>

      {/* Campaign list */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid #f3f4f6", background: "#ffffff" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>Your Campaigns</h2>
          <Link href="/business/campaigns" className="text-xs font-medium" style={{ color: "#6b7280" }}>
            View all
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No campaigns yet.</p>
            <Link href="/business/campaigns/new" className="text-sm font-medium mt-2 inline-block" style={{ color: "#4f46e5" }}>
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {campaigns.slice(0, 8).map((campaign, i) => {
              const views = campaign.applications.reduce((sum, app) => {
                return sum + app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
              }, 0);
              const s = statusStyle[campaign.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <Link
                  key={campaign.id}
                  href={`/business/campaigns/${campaign.id}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors"
                  style={{
                    borderTop: i > 0 ? "1px solid #f3f4f6" : undefined,
                  }}
                  onMouseEnter={undefined}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>
                      {campaign.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      {campaign._count.applications} applicants · {views.toLocaleString()} views
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {campaign.status}
                    </span>
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                      ${Number(campaign.totalBudget).toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
