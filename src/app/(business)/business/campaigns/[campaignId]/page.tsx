import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

const appStatusStyle: Record<string, { bg: string; color: string }> = {
  approved:  { bg: "#f0fdf4", color: "#15803d" },
  pending:   { bg: "#fffbeb", color: "#92400e" },
  rejected:  { bg: "#fef2f2", color: "#b91c1c" },
  active:    { bg: "#f0fdf4", color: "#15803d" },
  completed: { bg: "#f3f4f6", color: "#6b7280" },
  disputed:  { bg: "#fff7ed", color: "#c2410c" },
};

export default async function BusinessCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { businessProfile: { select: { id: true } } },
  });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      applications: {
        include: {
          creatorProfile: { select: { displayName: true, totalFollowers: true, engagementRate: true } },
          posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
        },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!campaign || campaign.businessProfileId !== user?.businessProfile?.id) notFound();

  const totalViews = campaign.applications.reduce((sum, app) => {
    return sum + app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
  }, 0);

  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((campaign.deadline.getTime() - now.getTime()) / 86400000));

  return (
    <div className="p-6 max-w-5xl">
      {/* Back */}
      <Link href="/business/campaigns" className="text-sm mb-4 inline-block" style={{ color: "#6b7280" }}>
        &larr; Back to campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>{campaign.name}</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {campaign.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            ${Number(campaign.totalBudget).toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            {daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e5e7eb" }}>
        {[
          { label: "CPV Rate", value: `$${campaign.businessCpv}` },
          { label: "Applications", value: String(campaign.applications.length) },
          { label: "Total Views", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews) },
          { label: "Target Geo", value: campaign.targetGeo.join(", ") || "Global" },
        ].map((stat) => (
          <div key={stat.label} className="px-5 py-4" style={{ background: "#ffffff" }}>
            <p className="text-lg font-semibold" style={{ color: "#0f172a" }}>{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Applications table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #f3f4f6", background: "#ffffff" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
            Applications ({campaign.applications.length})
          </h2>
        </div>

        {campaign.applications.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No applications yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {campaign.applications.map((app, i) => {
              const views = app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
              const s = appStatusStyle[app.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "#374151" }}
                    >
                      {app.creatorProfile.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>
                        {app.creatorProfile.displayName}
                      </p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>
                        {(app.creatorProfile.totalFollowers / 1000).toFixed(0)}K followers · {Number(app.creatorProfile.engagementRate).toFixed(1)}% eng.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <p className="text-sm" style={{ color: "#64748b" }}>
                      {views.toLocaleString()} views
                    </p>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
