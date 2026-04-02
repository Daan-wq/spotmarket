import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CampaignBudgetTracker } from "@/components/campaign/budget-tracker";
import Link from "next/link";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const { campaignId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: { select: { applications: true } },
    },
  });

  if (!campaign) redirect("/campaigns");

  // Get creator's application if exists
  const application = user?.creatorProfile
    ? await prisma.campaignApplication.findFirst({
        where: { campaignId, creatorProfileId: user.creatorProfile.id },
        select: { id: true, status: true },
      })
    : null;

  // Aggregate views for budget tracking
  const viewAgg = await prisma.campaignApplicationPage.aggregate({
    where: { application: { campaignId } },
    _sum: { totalViews: true },
  });
  const currentViews = viewAgg._sum.totalViews ?? 0;
  const totalBudget = Number(campaign.totalBudget);
  const businessCpv = Number(campaign.businessCpv);
  const goalViews = campaign.goalViews ? Number(campaign.goalViews) : null;
  const totalSpend = currentViews * businessCpv;
  const remainingBudget = Math.max(0, totalBudget - totalSpend);
  const daysLeft = Math.max(0, Math.ceil((campaign.deadline.getTime() - Date.now()) / 86400000));

  return (
    <div className="p-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/campaigns"
        className="text-sm mb-4 inline-flex items-center gap-1 hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        ← Back to campaigns
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {campaign.name}
          </h1>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full capitalize"
            style={{
              background: campaign.status === "active" ? "#f0fdf4" : campaign.status === "paused" ? "#fffbeb" : "var(--muted)",
              color: campaign.status === "active" ? "#15803d" : campaign.status === "paused" ? "#92400e" : "var(--text-muted)",
            }}
          >
            {campaign.status}
          </span>
        </div>
        {campaign.description && (
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {campaign.description}
          </p>
        )}
      </div>

      {/* Budget & Progress - Client component for live updates */}
      <CampaignBudgetTracker
        campaignId={campaignId}
        initialData={{
          totalBudget,
          totalSpend: Math.round(totalSpend * 100) / 100,
          remainingBudget: Math.round(remainingBudget * 100) / 100,
          totalViews: currentViews,
          goalViews,
          remainingViews: goalViews ? Math.max(0, goalViews - currentViews) : null,
          percentComplete: goalViews && goalViews > 0
            ? Math.min(100, Math.round((currentViews / goalViews) * 100))
            : totalBudget > 0
              ? Math.min(100, Math.round((totalSpend / totalBudget) * 100))
              : 0,
        }}
      />

      {/* Campaign details grid */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Campaign Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>CPV (Creator)</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
              ${(Number(campaign.creatorCpv) * 1_000_000).toFixed(0)}/1M
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Deadline</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
              {campaign.deadline.toLocaleDateString()} ({daysLeft}d)
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Target Geo</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
              {campaign.targetGeo.join(", ") || "Any"}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Applicants</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
              {campaign._count.applications}{campaign.maxSlots ? ` / ${campaign.maxSlots}` : ""}
            </p>
          </div>
        </div>

        {campaign.contentGuidelines && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--muted)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Content Guidelines</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {campaign.contentGuidelines}
            </p>
          </div>
        )}

        {campaign.requirements && (
          <div className="mt-3">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Requirements</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {campaign.requirements}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {application ? (
          <>
            <Link
              href={`/campaigns/${campaignId}/posts`}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: "var(--text-primary)" }}
            >
              {application.status === "approved" || application.status === "active" ? "Submit Posts" : "View Posts"}
            </Link>
            <Link
              href={`/campaigns/${campaignId}/messages`}
              className="px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--muted)", color: "var(--text-primary)" }}
            >
              Messages
            </Link>
          </>
        ) : (
          <form action={`/api/campaigns/${campaignId}/applications`} method="POST">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
              style={{ background: "var(--text-primary)" }}
            >
              Apply Now
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
