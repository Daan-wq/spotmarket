import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusStyle: Record<string, { bg: string; color: string }> = {
  active:    { bg: "#f0fdf4", color: "#15803d" },
  draft:     { bg: "#f3f4f6", color: "#6b7280" },
  paused:    { bg: "#fffbeb", color: "#b45309" },
  completed: { bg: "#eff6ff", color: "#1d4ed8" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function BusinessCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      businessProfile: {
        include: {
          campaigns: {
            include: { _count: { select: { applications: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user?.businessProfile) redirect("/onboarding");

  const campaigns = user.businessProfile.campaigns;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
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

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        {/* Header */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3"
          style={{ borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}
        >
          {["Campaign", "Status", "Budget", "Applicants", "Deadline"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
              {h}
            </p>
          ))}
        </div>

        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No campaigns yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {campaigns.map((campaign, i) => {
              const s = statusStyle[campaign.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <Link
                  key={campaign.id}
                  href={`/business/campaigns/${campaign.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>
                      {campaign.name}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#94a3b8" }}>
                      {campaign.description?.slice(0, 60) ?? "No description"}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {campaign.status}
                  </span>
                  <p className="text-sm font-medium whitespace-nowrap" style={{ color: "#0f172a" }}>
                    ${Number(campaign.totalBudget).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>
                    {campaign._count.applications}
                  </p>
                  <p className="text-sm whitespace-nowrap" style={{ color: "#94a3b8" }}>
                    {new Date(campaign.deadline).toLocaleDateString()}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
