import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MOCK_CAMPAIGNS } from "@/data/mock-campaigns";
import { CampaignCardAuth } from "@/components/marketplace/campaign-card-auth";
import { FeaturedCardStatic } from "@/components/marketplace/featured-card-static";
import type { MockCampaign } from "@/data/mock-campaigns";

export default async function CampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          socialAccounts: { where: { isActive: true } },
          applications: { select: { campaignId: true, status: true } },
        },
      },
    },
  });

  const profile = user?.creatorProfile;
  const hasInstagram = profile?.socialAccounts.some((a) => a.platform === "instagram");

  const realCampaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    include: {
      businessProfile: { select: { companyName: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const appliedMap = new Map(
    profile?.applications.map((a) => [a.campaignId, a.status]) ?? []
  );

  // Convert real campaigns to MockCampaign shape for the card component
  const realAsMock: MockCampaign[] = realCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.businessProfile.companyName,
    companyInitial: c.businessProfile.companyName.slice(0, 2).toUpperCase(),
    description: c.description ?? "",
    category: "Lifestyle",
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
    gradientFrom: "#1e2a40",
    gradientTo: "#4f46e5",
  }));

  const useMock = realCampaigns.length === 0;
  const displayCampaigns = useMock ? MOCK_CAMPAIGNS.filter(c => !c.featured) : realAsMock;
  const featuredCampaign = MOCK_CAMPAIGNS.find(c => c.featured)!;

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {useMock ? "Sample campaigns — connect Instagram to see matched campaigns." : "Campaigns matched to your profile."}
          </p>
        </div>
        <a
          href="/campaigns/new"
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          onMouseEnter={undefined}
        >
          + New campaign
        </a>
      </div>

      {/* Instagram banner */}
      {!hasInstagram && (
        <div
          className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ borderLeft: "3px solid #d97706", background: "#fffbeb" }}
        >
          <p className="text-sm" style={{ color: "#92400e" }}>
            Connect Instagram to unlock campaign matching and earnings tracking.
          </p>
          <a href="/api/auth/instagram" className="text-sm font-medium ml-4 shrink-0 hover:underline" style={{ color: "#b45309" }}>
            Connect →
          </a>
        </div>
      )}

      {/* Featured campaign */}
      {useMock && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#94a3b8" }}>
            Featured Campaign
          </p>
          <FeaturedCardStatic
            campaign={featuredCampaign}
            applyHref="/api/auth/instagram"
            applyLabel="Connect Instagram to Apply →"
          />
        </div>
      )}

      {/* Campaign grid */}
      <div>
        {useMock && (
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#94a3b8" }}>
            All Campaigns
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayCampaigns.map((campaign) => (
            <CampaignCardAuth
              key={campaign.id}
              campaign={campaign}
              isMock={useMock}
              creatorProfileId={profile?.id}
              applicationStatus={appliedMap.get(campaign.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
