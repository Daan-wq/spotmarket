import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CampaignCardAuth } from "@/components/marketplace/campaign-card-auth";
import type { CampaignCardData } from "@/types/campaign-card";

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

  const campaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const appliedMap = new Map(
    profile?.applications.map((a) => [a.campaignId, a.status]) ?? []
  );

  const campaignCards: CampaignCardData[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    company: "Campaign",
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
  }));

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Campaigns matched to your profile.</p>
        </div>
      </div>

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

      {campaignCards.length === 0 ? (
        <div className="rounded-xl px-6 py-16 text-center" style={{ border: "1px solid #e5e7eb" }}>
          <p className="text-sm font-medium" style={{ color: "#111827" }}>No active campaigns right now.</p>
          <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Check back soon — new campaigns launch regularly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaignCards.map((campaign) => (
            <CampaignCardAuth
              key={campaign.id}
              campaign={campaign}
              creatorProfileId={profile?.id}
              applicationStatus={appliedMap.get(campaign.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
