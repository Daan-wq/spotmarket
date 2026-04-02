import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdvertiserDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      advertiserProfile: {
        include: {
          campaigns: {
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { applications: true } },
            },
          },
        },
      },
    },
  });

  if (!dbUser?.advertiserProfile) redirect("/onboarding");

  const { campaigns } = dbUser.advertiserProfile;

  const pendingCounts = await Promise.all(
    campaigns.map(c =>
      prisma.campaignPost.count({
        where: { application: { campaignId: c.id }, status: "submitted" },
      })
    )
  );
  const pendingMap = new Map(campaigns.map((c, i) => [c.id, pendingCounts[i]]));

  const statusColor: Record<string, { bg: string; text: string }> = {
    draft: { bg: "var(--bg-primary)", text: "var(--text-secondary)" },
    active: { bg: "var(--success-bg)", text: "var(--success)" },
    paused: { bg: "var(--warning-bg)", text: "var(--warning-text)" },
    completed: { bg: "var(--accent-bg)", text: "var(--accent)" },
    cancelled: { bg: "var(--error-bg)", text: "var(--error)" },
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {dbUser.advertiserProfile.brandName}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Your campaigns</p>
        </div>
        <Link
          href="/advertiser/campaigns/new"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          + New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            No campaigns yet. Launch your first campaign to start reaching creators.
          </p>
          <Link
            href="/advertiser/campaigns/new"
            className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const colors = statusColor[c.status] ?? statusColor.draft;
            return (
              <div
                key={c.id}
                className="rounded-xl p-5 flex items-center justify-between"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Budget: ${Number(c.totalBudget).toLocaleString()} · {c._count.applications} applications
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {c.status}
                  </span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Due {new Date(c.deadline).toLocaleDateString()}
                  </p>
                  <Link
                    href={`/advertiser/campaigns/${c.id}/review`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent)", color: "#ffffff" }}
                  >
                    Review Submissions
                    {(pendingMap.get(c.id) ?? 0) > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.25)" }}>
                        {pendingMap.get(c.id)}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
