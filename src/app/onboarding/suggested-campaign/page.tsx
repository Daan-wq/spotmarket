import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default async function SuggestedCampaignPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!user) redirect("/onboarding");

  // Find the best active campaign to suggest
  const campaign = await prisma.campaign.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true } },
      createdBy: {
        select: {
          creatorProfile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  // Get top earners for this campaign if it exists
  let topEarners: { displayName: string; avatarUrl: string | null; totalEarned: number }[] = [];
  let totalCampaignEarners = 0;

  if (campaign) {
    const payouts = await prisma.payout.findMany({
      where: {
        status: { in: ["confirmed", "sent"] },
        application: { campaignId: campaign.id },
        creatorProfileId: { not: null },
      },
      select: {
        amount: true,
        creatorProfileId: true,
        creatorProfile: { select: { displayName: true, avatarUrl: true } },
      },
    });

    const creatorMap = new Map<string, { displayName: string; avatarUrl: string | null; total: number }>();
    for (const p of payouts) {
      if (!p.creatorProfileId) continue;
      const existing = creatorMap.get(p.creatorProfileId);
      const amt = parseFloat(p.amount.toString());
      if (existing) {
        existing.total += amt;
      } else {
        creatorMap.set(p.creatorProfileId, {
          displayName: p.creatorProfile?.displayName ?? "Unknown",
          avatarUrl: p.creatorProfile?.avatarUrl ?? null,
          total: amt,
        });
      }
    }

    const sorted = [...creatorMap.values()].sort((a, b) => b.total - a.total);
    topEarners = sorted.slice(0, 3).map((e) => ({
      displayName: e.displayName,
      avatarUrl: e.avatarUrl,
      totalEarned: e.total,
    }));
    totalCampaignEarners = sorted.length;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="mb-8">
        <Logo variant="light" size="sm" />
      </div>

      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Suggested Campaign
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Hey {user.creatorProfile?.displayName ?? "there"}! We found the perfect campaign for you. Start earning today.
        </p>
      </div>

      {campaign ? (
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {/* Campaign header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                style={{ background: "var(--accent)" }}
              >
                {campaign.createdBy?.creatorProfile?.avatarUrl ? (
                  <img
                    src={campaign.createdBy.creatorProfile.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  campaign.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {campaign.createdBy?.creatorProfile?.displayName ?? "Brand"}
                </p>
                <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {campaign.name}
                </p>
              </div>
            </div>

            {campaign.description && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                {campaign.description}
              </p>
            )}

            {/* Platform badges */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: "var(--muted)", color: "var(--text-primary)" }}
              >
                Instagram
              </span>
            </div>

            {/* Pay rate + Duration */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Pay per 1M views</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ${(Number(campaign.creatorCpv) * 1_000_000).toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Days left</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {Math.max(0, Math.ceil((campaign.deadline.getTime() - Date.now()) / 86400000))}
                </p>
              </div>
            </div>
          </div>

          {/* Top Earners */}
          {topEarners.length > 0 && (
            <div className="px-6 pb-4">
              <div className="p-4 rounded-xl" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <span>{"\uD83D\uDCC8"}</span> Top Earners
                </p>
                <div className="space-y-2.5">
                  {topEarners.map((earner, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      {earner.avatarUrl ? (
                        <img src={earner.avatarUrl} alt={earner.displayName} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                        >
                          {earner.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>
                        {earner.displayName}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                        ${earner.totalEarned.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                {totalCampaignEarners > 0 && (
                  <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>
                    {totalCampaignEarners} creator{totalCampaignEarners !== 1 ? "s" : ""} earned from this campaign
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 pb-6">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="block w-full py-3 rounded-xl text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Start This Campaign
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No active campaigns right now. Check back soon!
          </p>
        </div>
      )}

      <Link
        href="/creator/campaigns"
        className="mt-4 text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        Browse other campaigns
      </Link>

      <Link
        href="/creator/dashboard"
        className="mt-2 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Skip to dashboard →
      </Link>
    </div>
  );
}
