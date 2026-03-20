import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const statusStyle: Record<string, { bg: string; color: string }> = {
  approved:  { bg: "#f0fdf4", color: "#15803d" },
  pending:   { bg: "#fffbeb", color: "#92400e" },
  rejected:  { bg: "#fef2f2", color: "#b91c1c" },
  active:    { bg: "#f0fdf4", color: "#15803d" },
  completed: { bg: "#f3f4f6", color: "#6b7280" },
  disputed:  { bg: "#fff7ed", color: "#c2410c" },
};

export default async function BusinessApplicationsPage() {
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
                include: {
                  creatorProfile: { select: { displayName: true, totalFollowers: true } },
                },
                orderBy: { appliedAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.businessProfile) redirect("/onboarding");

  const allApplications = user.businessProfile.campaigns.flatMap((c) =>
    c.applications.map((app) => ({
      ...app,
      campaignName: c.name,
      campaignId: c.id,
    }))
  );

  allApplications.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Applications</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          {allApplications.length} application{allApplications.length !== 1 ? "s" : ""} across all campaigns
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div
          className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3"
          style={{ borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}
        >
          {["Creator", "Campaign", "Status", "Applied"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
              {h}
            </p>
          ))}
        </div>

        {allApplications.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No applications yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {allApplications.map((app, i) => {
              const s = statusStyle[app.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <div
                  key={app.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : undefined }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "#374151" }}
                    >
                      {app.creatorProfile.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>
                        {app.creatorProfile.displayName}
                      </p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>
                        {(app.creatorProfile.totalFollowers / 1000).toFixed(0)}K followers
                      </p>
                    </div>
                  </div>
                  <p className="text-sm truncate" style={{ color: "#374151" }}>{app.campaignName}</p>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {app.status}
                  </span>
                  <p className="text-sm whitespace-nowrap" style={{ color: "#94a3b8" }}>
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
