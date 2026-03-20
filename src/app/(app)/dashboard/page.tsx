import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MOCK_CAMPAIGNS } from "@/data/mock-campaigns";
import { StatCard } from "@/components/dashboard/stat-card";
import { DealCard } from "@/components/dashboard/deal-card";
import { ApplicationRow } from "@/components/dashboard/application-row";
import { TopHeader } from "@/components/dashboard/top-header";
import type { MockCampaign } from "@/data/mock-campaigns";

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
              campaign: { include: { businessProfile: { select: { companyName: true } } } },
              payouts: { where: { status: { in: ["confirmed", "sent"] } } },
              posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
            },
            orderBy: { appliedAt: "desc" },
            take: 8,
          },
        },
      },
      businessProfile: {
        include: { campaigns: { orderBy: { createdAt: "desc" }, take: 4 } },
      },
    },
  });

  const creatorProfile = user?.creatorProfile;
  const hasInstagram = creatorProfile?.socialAccounts.some(a => a.platform === "instagram");

  // Real campaigns from DB
  const realCampaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    include: {
      businessProfile: { select: { companyName: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const appliedMap = new Map(
    creatorProfile?.applications.map(a => [a.campaignId, a.status]) ?? []
  );

  const useMock = realCampaigns.length === 0;

  const displayCampaigns: MockCampaign[] = useMock
    ? MOCK_CAMPAIGNS.filter(c => !c.featured).slice(0, 4)
    : realCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        company: c.businessProfile.companyName,
        companyInitial: c.businessProfile.companyName.slice(0, 2).toUpperCase(),
        description: c.description ?? "",
        category: "Lifestyle" as const,
        totalBudget: Number(c.totalBudget ?? 0),
        currency: "€",
        cpvLabel: `~€${c.creatorCpv?.toString() ?? "0"}/view`,
        geo: c.targetGeo,
        deadline: c.deadline.toISOString(),
        daysLeft: Math.max(0, Math.ceil((c.deadline.getTime() - Date.now()) / 86400000)),
        applicants: c._count.applications,
        maxApplicants: 100,
        featured: false,
        minFollowers: c.minFollowers,
      }));

  // Stat calculations
  const followers = creatorProfile?.totalFollowers ?? 0;
  const engagementRate = Number(creatorProfile?.engagementRate ?? 0);

  const totalEarned = (creatorProfile?.applications ?? []).reduce((sum, app) => {
    return sum + app.payouts.reduce((s, p) => s + parseFloat(p.amount.toString()), 0);
  }, 0);

  const totalViews = (creatorProfile?.applications ?? []).reduce((sum, app) => {
    return sum + app.posts.reduce((s, post) => s + (post.snapshots[0]?.viewsCount ?? 0), 0);
  }, 0);

  // Applications for right panel — real or mock
  const mockApplications = [
    { brandInitial: "NK", brandName: "Nike",     campaignName: "Air Max Launch",   status: "approved", budget: "€25K", timeAgo: "3h ago" },
    { brandInitial: "SP", brandName: "Spotify",  campaignName: "Wrapped Campaign", status: "pending",  budget: "€20K", timeAgo: "1d ago" },
    { brandInitial: "SS", brandName: "Samsung",  campaignName: "Galaxy S Series",  status: "draft",    budget: "€28K", timeAgo: "2d ago" },
    { brandInitial: "LO", brandName: "L'Oréal",  campaignName: "Summer Glow",      status: "rejected", budget: "€9.5K","timeAgo": "3d ago" },
  ];

  const realApplications = (creatorProfile?.applications ?? []).map(app => ({
    brandInitial: app.campaign.businessProfile?.companyName?.slice(0, 2).toUpperCase() ?? "??",
    brandName: app.campaign.businessProfile?.companyName ?? "Brand",
    campaignName: app.campaign.name,
    status: app.status,
    budget: "—",
    timeAgo: timeAgo(new Date(app.appliedAt)),
  }));

  const displayApplications = realApplications.length > 0 ? realApplications : mockApplications;
  const showMockApps = realApplications.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "#f9fafb" }}>
      <TopHeader
        title="Dashboard"
        displayName={creatorProfile?.displayName ?? undefined}
        followers={followers > 0 ? followers : undefined}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Instagram banner */}
        {!hasInstagram && (
          <div
            className="mb-6 flex items-center justify-between px-4 py-3 rounded-lg"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <p className="text-sm" style={{ color: "#92400e" }}>
              Connect Instagram to unlock real campaign matching and earnings tracking.
            </p>
            <a href="/api/auth/instagram" className="text-sm font-semibold ml-4 shrink-0" style={{ color: "#92400e" }}>
              Connect →
            </a>
          </div>
        )}

        {/* Stat cards */}
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

        {/* Main two-column area */}
        <div className="flex gap-6 items-start">
          {/* Left: Brand Campaigns */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                Brand Campaigns Available
              </h2>
              <a href="/campaigns" className="text-xs font-medium" style={{ color: "#6b7280" }}>
                View all →
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayCampaigns.map(campaign => (
                <DealCard
                  key={campaign.id}
                  campaign={campaign}
                  isMock={useMock}
                  creatorProfileId={creatorProfile?.id}
                  applicationStatus={appliedMap.get(campaign.id)}
                />
              ))}
            </div>
          </div>

          {/* Right: Applications */}
          <div
            className="w-72 shrink-0 rounded-xl overflow-hidden"
            style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid #f3f4f6" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>Your Applications</h2>
              {showMockApps && (
                <span className="text-xs" style={{ color: "#9ca3af" }}>Preview</span>
              )}
            </div>

            <div className="px-4">
              {displayApplications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#9ca3af" }}>No applications yet.</p>
                  <a href="/campaigns" className="text-sm font-medium mt-1 inline-block" style={{ color: "#111827" }}>
                    Browse campaigns →
                  </a>
                </div>
              ) : (
                displayApplications.map((app, i) => (
                  <ApplicationRow key={i} {...app} />
                ))
              )}
            </div>

            {displayApplications.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: "1px solid #f3f4f6" }}>
                <a href="/applications" className="text-xs font-medium" style={{ color: "#6b7280" }}>
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
