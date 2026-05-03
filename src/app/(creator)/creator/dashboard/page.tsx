import { Suspense } from "react";
import Link from "next/link";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LiveEarnings } from "./_components/live-earnings";
import { ScoreCard } from "@/components/clipper-score/score-card";
import { getActivationStatus } from "@/lib/activation";
import { DashboardAlerts } from "./_components/dashboard-alerts";
import {
  CreatorJourney,
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
  type JourneyStepItem,
} from "../_components/creator-journey";

export default async function DashboardPage() {
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  const userId = header.id;
  const profileId = header.creatorProfile.id;
  const displayName = header.creatorProfile.displayName;

  const [
    earningsResult,
    paidResult,
    activeCampaignRows,
    pendingSubmissions,
    igConnections,
    fbConnections,
    ytConnections,
    ttConnections,
    activation,
  ] = await Promise.all([
    prisma.campaignSubmission.aggregate({
      where: { creatorId: userId, status: "APPROVED" },
      _sum: { earnedAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorProfile: { userId }, status: { in: ["confirmed", "sent"] } },
      _sum: { amount: true },
    }),
    prisma.campaignApplication.findMany({
      where: {
        creatorProfileId: profileId,
        status: { in: ["pending", "approved", "active"] },
      },
      select: {
        id: true,
        status: true,
        campaign: {
          select: {
            id: true,
            name: true,
            deadline: true,
            creatorCpv: true,
            platform: true,
          },
        },
      },
      orderBy: { appliedAt: "desc" },
      take: 4,
    }),
    prisma.campaignSubmission.count({
      where: { creatorId: userId, status: "PENDING" },
    }),
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId: profileId }, select: { isVerified: true } }),
    getActivationStatus(userId),
  ]);

  const totalEarnings = Number(earningsResult._sum.earnedAmount || 0);
  const totalPaid = Number(paidResult._sum.amount || 0);
  const availableBalance = Math.max(totalEarnings - totalPaid, 0);
  const hasUnpaidBalance = availableBalance > 0;
  const activeCampaigns = activeCampaignRows.length;

  const firstName = displayName.split(/\s+/)[0] || displayName;
  const statusLine = activation.fullyActivated
    ? `${pendingSubmissions} ${pendingSubmissions === 1 ? "clip" : "clips"} awaiting review.`
    : "Finish the next step in the creator workflow before making more moves.";

  const platforms = [
    { connected: igConnections.length > 0, verified: igConnections.some((c) => c.isVerified) },
    { connected: fbConnections.length > 0, verified: fbConnections.some((c) => c.isVerified) },
    { connected: ytConnections.length > 0, verified: ytConnections.some((c) => c.isVerified) },
    { connected: ttConnections.length > 0, verified: ttConnections.some((c) => c.isVerified) },
  ];
  const connectedCount = platforms.filter((p) => p.connected).length;
  const verifiedCount = platforms.filter((p) => p.verified).length;
  const allVerified = connectedCount > 0 && verifiedCount === connectedCount;

  const workflowSteps: JourneyStepItem[] = [
    {
      id: "profile",
      label: "Set up your creator profile",
      description: "Keep your creator identity ready before joining paid campaigns.",
      status: activation.profileComplete ? "complete" : "current",
      meta: activation.profileComplete ? "Profile ready" : "Required first step",
      cta: activation.profileComplete ? undefined : { label: "Edit profile", href: "/creator/profile" },
    },
    {
      id: "pages",
      label: "Connect a tracked page",
      description: "OAuth-connected pages let ClipProfit verify views and match clips to campaigns.",
      status: activation.accountConnected ? "complete" : activation.profileComplete ? "current" : "blocked",
      meta: connectedCount > 0 ? `${verifiedCount}/${connectedCount} verified platforms` : "No connected pages yet",
      cta: activation.accountConnected ? undefined : { label: "Open Pages", href: "/creator/connections" },
    },
    {
      id: "campaign",
      label: "Find a campaign to work on",
      description: "Pick an eligible campaign, read the brief, and join before creating content.",
      status: activeCampaigns > 0 ? "complete" : activation.accountConnected ? "current" : "blocked",
      meta: activeCampaigns > 0 ? `${activeCampaigns} active or pending campaign${activeCampaigns === 1 ? "" : "s"}` : "Waiting for a connected page",
      cta: activeCampaigns > 0 ? undefined : { label: "Browse campaigns", href: "/creator/campaigns" },
    },
    {
      id: "submit",
      label: "Submit your clip",
      description: "Send the post URL from a joined campaign so review and tracking can start.",
      status: activation.firstClipSubmitted ? "complete" : activeCampaigns > 0 ? "current" : "blocked",
      meta: activation.firstClipSubmitted ? "First clip submitted" : "Requires a joined campaign",
      cta: activation.firstClipSubmitted ? undefined : { label: "Go to campaigns", href: "/creator/campaigns" },
    },
    {
      id: "review",
      label: "Track review and performance",
      description: "Watch pending clips, fix rejected ones, and use performance notes to improve the next edit.",
      status: activation.firstApproval ? "complete" : activation.firstClipSubmitted ? "current" : "blocked",
      meta: pendingSubmissions > 0 ? `${pendingSubmissions} awaiting review` : "No pending clips",
      cta: activation.firstClipSubmitted && !activation.firstApproval ? { label: "Check clips", href: "/creator/videos" } : undefined,
    },
    {
      id: "paid",
      label: "Get paid",
      description: "Once earnings are approved, keep payout details ready and request withdrawals from Payments.",
      status: activation.paymentMethodAdded && !hasUnpaidBalance ? "complete" : activation.firstApproval || hasUnpaidBalance ? "current" : "blocked",
      meta: hasUnpaidBalance ? `$${availableBalance.toFixed(2)} available` : activation.paymentMethodAdded ? "Payout setup ready" : "Unlocks after approved clips",
      cta: activation.firstApproval || hasUnpaidBalance ? { label: "Open payments", href: "/creator/payouts" } : undefined,
    },
  ];

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Creator workflow"
        title={`Good to see you, ${firstName}`}
        description={statusLine}
      />

      <DashboardAlerts activation={activation} hasUnpaidBalance={hasUnpaidBalance} />

      <CreatorJourney
        title="Your path to the next payout"
        description="Move through the creator process in order. Each step unlocks the next one, so the dashboard stays focused on what to do now."
        steps={workflowSteps}
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
          <CreatorSectionHeader
            title="Next best action"
            description="The dashboard chooses one clear move from your activation, campaign, clip, and payout state."
          />
          <NextAction
            profileComplete={activation.profileComplete}
            accountConnected={activation.accountConnected}
            activeCampaigns={activeCampaigns}
            pendingSubmissions={pendingSubmissions}
            hasUnpaidBalance={hasUnpaidBalance}
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
          <CreatorSectionHeader title="Payout summary" description="Estimated earnings become final after review and payout processing." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniPayout label="Estimated" value={`$${totalEarnings.toFixed(2)}`} />
            <MiniPayout label="Pending/final" value={`$${availableBalance.toFixed(2)}`} />
            <MiniPayout label="Paid" value={`$${totalPaid.toFixed(2)}`} />
          </div>
          <Link href="/creator/payouts" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800">
            Open payments
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <CreatorSectionHeader title="Active campaigns" description="Campaigns you have joined or started. Open one to submit the next clip." />
        {activeCampaignRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <p className="font-semibold text-neutral-950">No active campaigns yet</p>
            <p className="mt-2 text-sm text-neutral-500">Browse the marketplace and join a campaign that matches your connected accounts.</p>
            <Link href="/creator/campaigns" className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800">
              Browse campaigns
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {activeCampaignRows.map((application) => (
              <Link key={application.id} href={`/creator/campaigns/${application.campaign.id}`} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-300 hover:bg-white">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-neutral-950">{application.campaign.name}</p>
                  <Badge variant={application.status === "active" ? "verified" : "neutral"}>{application.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-neutral-500">
                  ${(Number(application.campaign.creatorCpv) * 1000).toFixed(2)} CPM · {application.campaign.platform}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Due {application.campaign.deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <CreatorSectionHeader
          title="Operating snapshot"
          description="The numbers support the workflow instead of competing with the next action."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SoftStat label="Total earnings" value={`$${totalEarnings.toFixed(2)}`} detail="Approved creator earnings" />
          <SoftStat label="Active campaigns" value={activeCampaigns.toString()} detail="Pending, approved, or active" />
          <SoftStat label="Pending submissions" value={pendingSubmissions.toString()} detail="Clips awaiting review" />
          <SoftStat
            label="Verified platforms"
            value={connectedCount === 0 ? "-" : `${verifiedCount}/${connectedCount}`}
            detail={allVerified ? "All connected pages verified" : "Pages ready for tracking"}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LiveEarnings />
        </div>
        <ScoreCard creatorProfileId={profileId} variant="compact" />
      </section>

      <Suspense fallback={<RecentSubmissionsSkeleton />}>
        <RecentSubmissions creatorId={userId} />
      </Suspense>
    </div>
  );
}

function NextAction({
  profileComplete,
  accountConnected,
  activeCampaigns,
  pendingSubmissions,
  hasUnpaidBalance,
}: {
  profileComplete: boolean;
  accountConnected: boolean;
  activeCampaigns: number;
  pendingSubmissions: number;
  hasUnpaidBalance: boolean;
}) {
  const action = !profileComplete
    ? { title: "Finish your profile", detail: "Campaign eligibility starts with a complete profile.", href: "/creator/profile" }
    : !accountConnected
      ? { title: "Connect a posting account", detail: "Connect TikTok, Instagram, YouTube, or Facebook so tracking can work.", href: "/creator/connections" }
      : activeCampaigns === 0
        ? { title: "Join a campaign", detail: "Pick a campaign that matches your platform and payout target.", href: "/creator/campaigns" }
        : pendingSubmissions > 0
          ? { title: "Check pending clips", detail: "Review status, fixes, and earnings from your submitted clips.", href: "/creator/videos" }
          : hasUnpaidBalance
            ? { title: "Review payout status", detail: "Approved earnings are ready to track in Payments.", href: "/creator/payouts" }
            : { title: "Submit another clip", detail: "Open a joined campaign and send the next post URL.", href: "/creator/campaigns" };

  return (
    <div>
      <p className="text-2xl font-semibold text-neutral-950">{action.title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{action.detail}</p>
      <Link href={action.href} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800">
        Continue
      </Link>
    </div>
  );
}

function MiniPayout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

async function RecentSubmissions({ creatorId }: { creatorId: string }) {
  const recentSubmissions = await prisma.campaignSubmission.findMany({
    where: { creatorId },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <CreatorSectionHeader
        title="Recent submissions"
        description="Latest clips moving through review, approval, and payout."
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Campaign</th>
              <th className="px-4 py-3 text-left font-medium">Claimed views</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Earned</th>
            </tr>
          </thead>
          <tbody>
            {recentSubmissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-neutral-500">
                  No submissions yet
                </td>
              </tr>
            ) : (
              recentSubmissions.map((sub) => (
                <tr key={sub.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-950">
                    {sub.campaign.name}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {sub.claimedViews.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ color: getStatusColor(sub.status), backgroundColor: `${getStatusColor(sub.status)}18` }}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    ${Number(sub.earnedAmount).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentSubmissionsSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
      <Skeleton className="mb-2 h-6 w-44" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function getStatusColor(status: string) {
  if (status === "APPROVED" || status === "active" || status === "verified") return "#16a34a";
  if (status === "PENDING") return "#d97706";
  if (status === "REJECTED" || status === "failed") return "#dc2626";
  return "#64748b";
}
