import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { DealCard } from "@/components/dashboard/deal-card";
import { ApplicationRow } from "@/components/dashboard/application-row";
import { TopHeader } from "@/components/dashboard/top-header";
import type { CampaignCardData } from "@/types/campaign-card";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          socialAccounts: true,
          applications: {
            include: {
              campaign: true,
              payouts: { where: { status: { in: ["confirmed", "sent"] } } },
              posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
            },
            orderBy: { appliedAt: "desc" },
            take: 8,
          },
        },
      },
    },
  });

  const creatorProfile = user?.creatorProfile;
  const hasInstagram = creatorProfile?.socialAccounts.some(a => a.platform === "instagram");

  const campaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    include: {
      _count: { select: { applications: true } },
      createdBy: {
        select: {
          id: true,
          creatorProfile: { select: { displayName: true, avatarUrl: true } },
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  // Campaigns launched by this user
  const ownedCampaigns = user?.id ? await prisma.campaign.findMany({
    where: { createdByUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true, name: true, status: true, totalBudget: true,
      depositTxHash: true, rejectReason: true, createdAt: true,
      goalViews: true,
      _count: { select: { applications: true } },
    },
  }) : [];

  const appliedMap = new Map(
    creatorProfile?.applications.map(a => [a.campaignId, a.status]) ?? []
  );

  const campaignCards: CampaignCardData[] = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    company: c.createdBy?.creatorProfile?.displayName ?? c.createdBy?.email?.split("@")[0] ?? "Campaign",
    companyInitial: c.name.slice(0, 2).toUpperCase(),
    description: c.description ?? "",
    totalBudget: Number(c.totalBudget),
    currency: "€",
    cpvLabel: `~$${(Number(c.creatorCpv) * 1_000_000).toFixed(0)}/1M views`,
    geo: c.targetGeo,
    daysLeft: Math.max(0, Math.ceil((c.deadline.getTime() - Date.now()) / 86400000)),
    applicants: c._count.applications,
    maxApplicants: c.maxSlots ?? 100,
    minFollowers: c.minFollowers,
    goalViews: c.goalViews ? Number(c.goalViews) : null,
    currentViews: 0,
    remainingBudget: Number(c.totalBudget),
    launchedBy: c.createdBy ? {
      id: c.createdBy.id,
      name: c.createdBy.creatorProfile?.displayName ?? c.createdBy.email.split("@")[0],
      avatarUrl: c.createdBy.creatorProfile?.avatarUrl ?? null,
    } : null,
  }));

  const followers = creatorProfile?.totalFollowers ?? 0;
  const engagementRate = Number(creatorProfile?.engagementRate ?? 0);

  const totalEarned = (creatorProfile?.applications ?? []).reduce((sum, app) => {
    return sum + app.payouts.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
  }, 0);

  const totalViews = (creatorProfile?.applications ?? []).reduce((sum, app) => {
    return sum + app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
  }, 0);

  const applications = (creatorProfile?.applications ?? []).map(app => ({
    brandInitial: app.campaign.name.slice(0, 2).toUpperCase(),
    brandName: app.campaign.name,
    campaignName: app.campaign.name,
    status: app.status,
    budget: "—",
    timeAgo: timeAgo(new Date(app.appliedAt)),
  }));

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      <TopHeader
        title="Dashboard"
        displayName={creatorProfile?.displayName ?? undefined}
        followers={followers > 0 ? followers : undefined}
        userId={authUser.id}
      />

      <div className="flex-1 overflow-auto p-6">
        {!hasInstagram && (
          <div
            className="mb-6 flex items-center justify-between px-4 py-3 rounded-lg"
            style={{ background: "var(--warning-bg)", border: "1px solid #fde68a" }}
          >
            <p className="text-sm" style={{ color: "var(--warning-text)" }}>
              Connect Instagram to unlock real campaign matching and earnings tracking.
            </p>
            <a href="/api/auth/instagram" className="text-sm font-semibold ml-4 shrink-0" style={{ color: "var(--warning-text)" }}>
              Connect →
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Followers"
            value={followers >= 1000 ? `${(followers / 1000).toFixed(0)}K` : followers > 0 ? String(followers) : "—"}
            sub={followers > 0 ? `${engagementRate}% eng.` : undefined}
            subPositive={engagementRate > 2}
          />
          <StatCard
            label="Total Earned"
            value={totalEarned > 0 ? `$${totalEarned.toFixed(2)}` : "—"}
            sub={totalEarned > 0 ? "Paid out" : undefined}
            subPositive={totalEarned > 0}
          />
          <StatCard
            label="Total Views"
            value={totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews > 0 ? String(totalViews) : "—"}
          />
          <StatCard
            label="Active Campaigns"
            value={String((creatorProfile?.applications ?? []).filter(a => a.status === "active" || a.status === "approved").length)}
          />
        </div>

        {/* My Launched Campaigns */}
        {ownedCampaigns.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>My Campaigns</h2>
              <a href="/launch" className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>
                + New campaign
              </a>
            </div>
            <div className="space-y-2">
              {ownedCampaigns.map((c) => {
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  pending_payment: { label: "Awaiting payment", color: "#92400e", bg: "#fffbeb" },
                  pending_review:  { label: "Under review",     color: "#1e40af", bg: "#eff6ff" },
                  active:          { label: "Active",            color: "#065f46", bg: "#ecfdf5" },
                  paused:          { label: "Paused",            color: "#374151", bg: "#f3f4f6" },
                  completed:       { label: "Completed",         color: "#374151", bg: "#f3f4f6" },
                  cancelled:       { label: "Rejected",          color: "#991b1b", bg: "#fef2f2" },
                };
                const cfg = statusConfig[c.status] ?? { label: c.status, color: "#374151", bg: "#f3f4f6" };
                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>${Number(c.totalBudget).toLocaleString()} USDT</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {c.status === "pending_payment" && (
                        <a href={`/launch/${c.id}/payment`} className="text-xs font-medium px-2.5 py-1 rounded-lg text-white" style={{ background: "var(--accent)" }}>
                          Pay now
                        </a>
                      )}
                      {c.rejectReason && (
                        <span className="text-xs text-red-600 max-w-[160px] truncate" title={c.rejectReason}>
                          {c.rejectReason}
                        </span>
                      )}
                      {(c.status === "active" || c.status === "completed") && (
                        <a href={`/admin/campaigns/${c.id}`} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {ownedCampaigns.length === 0 && (
          <div className="mb-8 flex items-center justify-between px-4 py-3 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Want to run your own campaign?</p>
            <a href="/launch" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0 ml-4" style={{ background: "var(--accent)" }}>
              Launch campaign
            </a>
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* Left: Campaigns */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Brand Campaigns Available</h2>
              <a href="/campaigns" className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>View all →</a>
            </div>
            {campaignCards.length === 0 ? (
              <div className="rounded-xl px-6 py-10 text-center" style={{ border: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active campaigns right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campaignCards.map(campaign => (
                  <DealCard
                    key={campaign.id}
                    campaign={campaign}
                    creatorProfileId={creatorProfile?.id}
                    applicationStatus={appliedMap.get(campaign.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Applications */}
          <div
            className="w-72 shrink-0 rounded-xl overflow-hidden"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--bg-secondary)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Your Applications</h2>
            </div>

            <div className="px-4">
              {applications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No applications yet.</p>
                  <a href="/campaigns" className="text-sm font-medium mt-1 inline-block" style={{ color: "var(--text-primary)" }}>
                    Browse campaigns →
                  </a>
                </div>
              ) : (
                applications.map((app, i) => (
                  <ApplicationRow key={i} {...app} />
                ))
              )}
            </div>

            {applications.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: "1px solid var(--bg-secondary)" }}>
                <a href="/applications" className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  View all applications →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
