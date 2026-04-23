import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CampaignDetailClient } from "./_components/campaign-detail-client";
import PlatformIcon from "@/components/shared/PlatformIcon";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { userId } = await requireAuth("creator");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSubmissions: {
        select: { earnedAmount: true, status: true },
      },
    },
  });
  if (!campaign || campaign.status !== "active") notFound();

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, discordId: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const [igConnections, ytConnections, ttConnections, fbConnections] = await Promise.all([
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId: profile.id } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId: profile.id } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId: profile.id } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId: profile.id } }),
  ]);
  const isVerified =
    igConnections.some((c) => c.isVerified) ||
    ytConnections.length > 0 ||
    ttConnections.length > 0 ||
    fbConnections.length > 0;

  const existingApplication = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: profile.id },
  });

  // Get creator's submissions for this campaign
  const mySubmissions = await prisma.campaignSubmission.findMany({
    where: { campaignId, creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      postUrl: true,
      status: true,
      earnedAmount: true,
      claimedViews: true,
      createdAt: true,
    },
  });

  // Get top earners for this campaign
  const topEarners = await prisma.campaignSubmission.groupBy({
    by: ["creatorId"],
    where: { campaignId, status: "APPROVED" },
    _sum: { earnedAmount: true },
    orderBy: { _sum: { earnedAmount: "desc" } },
    take: 5,
  });

  const totalPaid = campaign.campaignSubmissions.reduce(
    (sum, s) => sum + Number(s.earnedAmount),
    0
  );
  const totalBudget = Number(campaign.totalBudget);
  const paidPercent = totalBudget > 0 ? Math.min((totalPaid / totalBudget) * 100, 100) : 0;
  const rewardRate = Number(campaign.creatorCpv) * 1000;

  const hasDiscord = !!user.discordId;
  const canApply = isVerified && !existingApplication && hasDiscord;

  // Parse requirements into steps
  const requirementSteps = campaign.requirements
    ? campaign.requirements.split("\n").filter((r) => r.trim())
    : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/creator/campaigns"
          className="flex items-center gap-1 text-sm font-medium transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/creator/campaigns/${campaignId}/contact`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              background: "var(--bg-card)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
            Contact
          </Link>
        </div>
      </div>

      {/* Campaign Header */}
      <div className="text-center mb-6">
        {campaign.bannerUrl ? (
          <img src={campaign.bannerUrl} alt="" className="w-24 h-24 rounded-xl object-cover mx-auto mb-4" />
        ) : (
          <div
            className="w-24 h-24 rounded-xl flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4"
            style={{ background: "#e5e7eb" }}
          >
            <span style={{ color: "var(--text-primary)" }}>
              {campaign.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {campaign.name}
        </h1>
      </div>

      {/* Primary CTA */}
      <CampaignDetailClient
        campaignId={campaignId}
        campaignName={campaign.name}
        canApply={canApply}
        hasApplication={!!existingApplication}
        applicationId={existingApplication?.id}
        isVerified={isVerified}
        hasDiscord={hasDiscord}
      />


      {/* Payout Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
            PAID OUT
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {paidPercent.toFixed(0)}%
          </span>
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          ${totalPaid.toFixed(2)} of ${totalBudget.toFixed(2)} paid out
        </p>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-default)" }}>
          <div className="h-full rounded-full" style={{ width: `${paidPercent}%`, background: "var(--primary)" }} />
        </div>
      </div>

      {/* Metadata Row */}
      <div
        className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-xl mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
      >
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>REWARD</div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
            ${rewardRate.toFixed(1)} / 1K
          </span>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>TYPE</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{campaign.contentType ?? "UGC"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>PAYOUT RANGE</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>$0 - ${totalBudget.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>CATEGORY</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{campaign.niche ?? "General"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>PLATFORMS</div>
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={campaign.platform} size={24} />
          </div>
        </div>
      </div>

      {/* Requirements */}
      {requirementSteps.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>REQUIREMENTS</div>
          <div className="flex flex-wrap gap-2">
            {requirementSteps.map((step, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              >
                <span className="font-semibold" style={{ color: "var(--text-muted)" }}>{i + 1}/</span>
                {step.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content Guidelines */}
      {(campaign.guidelinesUrl || (campaign.contentAssetUrls && campaign.contentAssetUrls.length > 0)) && (
        <div className="mb-6">
          <div className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--text-muted)" }}>AVAILABLE CONTENT</div>
          <div className="space-y-2">
            {campaign.guidelinesUrl && (
              <a href={campaign.guidelinesUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: "var(--primary)" }}>
                Campaign Guidelines
              </a>
            )}
          </div>
        </div>
      )}

      {/* Your Submissions */}
      <div className="mb-6">
        <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>YOUR SUBMISSIONS</div>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          See what content you&apos;ve submitted to this campaign. We&apos;ll show it here as soon as your upload starts processing.
        </p>

        {mySubmissions.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto" style={{ color: "var(--text-muted)" }}>
              <polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" />
            </svg>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>No submissions yet</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Upload your first video to this campaign and it will appear here once processing begins.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mySubmissions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {sub.postUrl ? new URL(sub.postUrl).hostname : "Uploaded video"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {sub.claimedViews.toLocaleString()} views
                  </span>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: sub.status === "APPROVED" ? "var(--success-bg)" : sub.status === "REJECTED" ? "var(--error-bg)" : "var(--warning-bg)",
                      color: sub.status === "APPROVED" ? "var(--success-text)" : sub.status === "REJECTED" ? "var(--error-text)" : "var(--warning-text)",
                    }}
                  >
                    {sub.status === "PENDING" ? "Pending" : sub.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Biggest Earners */}
      <div>
        <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>BIGGEST EARNERS</div>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          See what content performs best, submit your own and join this Content Reward&apos;s top earners
        </p>
        {topEarners.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No Creators Posted Yet</p>
        ) : (
          <div className="space-y-2">
            {topEarners.map((earner, i) => (
              <div
                key={earner.creatorId}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
              >
                <span className="text-sm font-bold w-6 text-center" style={{ color: i < 3 ? "var(--primary)" : "var(--text-muted)" }}>
                  #{i + 1}
                </span>
                <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>
                  Creator
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--success-text)" }}>
                  +${Number(earner._sum.earnedAmount ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
