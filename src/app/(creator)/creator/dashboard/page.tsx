import { Suspense } from "react";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveEarnings } from "./_components/live-earnings";
import { ScoreCard } from "@/components/clipper-score/score-card";
import { CreatorPageHeader, CreatorSectionHeader } from "../_components/creator-journey";
import {
  NextActionAndAlerts,
  NextActionAndAlertsSkeleton,
} from "./_components/next-action-and-alerts";
import {
  PayoutSummary,
  PayoutSummarySkeleton,
} from "./_components/payout-summary";
import {
  ActiveCampaigns,
  ActiveCampaignsSkeleton,
} from "./_components/active-campaigns";
import {
  OperatingSnapshot,
  OperatingSnapshotSkeleton,
} from "./_components/operating-snapshot";

export default async function DashboardPage() {
  const { userId: supabaseId } = await requireAuth("creator");

  // Single indexed lookup, React.cache-deduped against layout's identity slot
  // and against any nested Suspense child that calls getCreatorHeader.
  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  const userId = header.id;
  const profileId = header.creatorProfile.id;
  const firstName =
    header.creatorProfile.displayName.split(/\s+/)[0] ||
    header.creatorProfile.displayName;

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Creator home"
        title={`Good to see you, ${firstName}`}
        description="Your most important next move and current operating snapshot."
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <Suspense fallback={<NextActionAndAlertsSkeleton />}>
            <NextActionAndAlerts userId={userId} profileId={profileId} />
          </Suspense>
        </div>

        <Suspense fallback={<PayoutSummarySkeleton />}>
          <PayoutSummary userId={userId} />
        </Suspense>
      </section>

      <Suspense fallback={<ActiveCampaignsSkeleton />}>
        <ActiveCampaigns profileId={profileId} />
      </Suspense>

      <Suspense fallback={<OperatingSnapshotSkeleton />}>
        <OperatingSnapshot userId={userId} profileId={profileId} />
      </Suspense>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LiveEarnings />
        </div>
        <Suspense fallback={<ScoreCardSkeleton />}>
          <ScoreCard creatorProfileId={profileId} variant="compact" />
        </Suspense>
      </section>

      <Suspense fallback={<RecentSubmissionsSkeleton />}>
        <RecentSubmissions creatorId={userId} />
      </Suspense>
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

function ScoreCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-10 w-20" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

function getStatusColor(status: string) {
  if (status === "APPROVED" || status === "active" || status === "verified") return "#16a34a";
  if (status === "PENDING") return "#d97706";
  if (status === "REJECTED" || status === "failed") return "#dc2626";
  return "#64748b";
}
