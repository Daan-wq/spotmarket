import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopHeader } from "@/components/dashboard/top-header";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function EarningsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          applications: {
            include: {
              payouts: true,
              campaign: { select: { name: true, creatorCpv: true, status: true } },
              posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
            },
          },
        },
      },
    },
  });

  const applications = user?.creatorProfile?.applications ?? [];

  const totalEarned = applications.reduce((sum, app) => {
    const paidPayouts = app.payouts.filter((p) => p.status === "confirmed" || p.status === "sent");
    return sum + paidPayouts.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
  }, 0);

  const pendingEarnings = applications.reduce((sum, app) => {
    const cpv = parseFloat(app.campaign.creatorCpv.toString());
    const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
    const paidPayouts = app.payouts.filter((p) => p.status === "confirmed" || p.status === "sent");
    const paid = paidPayouts.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
    return sum + Math.max(0, views * cpv - paid);
  }, 0);

  const totalViews = applications.reduce((sum, app) => {
    return sum + app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
  }, 0);

  const activeCampaigns = applications.filter(
    (app) => app.campaign.status === "active" && (app.status === "approved" || app.status === "active")
  ).length;

  // Build chart data from per-campaign earnings
  const chartData = applications
    .filter((app) => app.posts.length > 0)
    .map((app) => {
      const cpv = parseFloat(app.campaign.creatorCpv.toString());
      const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
      return {
        label: app.campaign.name.length > 12 ? app.campaign.name.slice(0, 12) + "..." : app.campaign.name,
        earned: views * cpv,
        views,
      };
    });

  return (
    <div className="flex flex-col h-full" style={{ background: "#f9fafb" }}>
      <TopHeader title="Earnings" />

      <div className="flex-1 overflow-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Earned"
            value={`$${totalEarned.toFixed(2)}`}
            sub={totalEarned > 0 ? "Paid out" : undefined}
            subPositive={totalEarned > 0}
          />
          <StatCard
            label="Pending"
            value={`$${pendingEarnings.toFixed(2)}`}
            sub={pendingEarnings > 0 ? "Awaiting payout" : undefined}
          />
          <StatCard
            label="Total Views"
            value={totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews)}
          />
          <StatCard
            label="Active Campaigns"
            value={String(activeCampaigns)}
          />
        </div>

        {/* Chart */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
              Earnings by Campaign
            </h2>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              Based on verified views
            </p>
          </div>
          <EarningsChart data={chartData} />
        </div>

        {/* Campaign breakdown table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #f3f4f6", background: "#ffffff" }}
          >
            <p className="text-sm font-semibold" style={{ color: "#111827" }}>Campaign Breakdown</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              {applications.length} campaign{applications.length !== 1 ? "s" : ""}
            </p>
          </div>
          {applications.length === 0 ? (
            <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
              <p className="text-sm" style={{ color: "#94a3b8" }}>No campaigns yet.</p>
              <a href="/campaigns" className="text-sm font-medium mt-2 inline-block" style={{ color: "#4f46e5" }}>
                Browse campaigns
              </a>
            </div>
          ) : (
            <div style={{ background: "#ffffff" }}>
              {applications.map((app, i) => {
                const cpv = parseFloat(app.campaign.creatorCpv.toString());
                const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
                const estimated = views * cpv;
                const statusColor = app.campaign.status === "active"
                  ? { bg: "#f0fdf4", color: "#15803d" }
                  : { bg: "#f3f4f6", color: "#6b7280" };
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : undefined }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>
                          {app.campaign.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                          {views.toLocaleString()} views · ${cpv.toFixed(4)}/view
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: statusColor.bg, color: statusColor.color }}
                      >
                        {app.campaign.status}
                      </span>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                        ${estimated.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
