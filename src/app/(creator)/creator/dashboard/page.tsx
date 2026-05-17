import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";
import { formatCurrencyPrecise, formatNumber } from "@/lib/admin/agency-format";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
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
  const t = await getTranslations("dashboard.creator");

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
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title", { name: firstName })}
        description={t("page.description")}
      />

      <Suspense fallback={<NextActionAndAlertsSkeleton />}>
        <NextActionAndAlerts userId={userId} profileId={profileId} />
      </Suspense>

      <section className="border-t border-neutral-200 pt-6">
        <CreatorSectionHeader
          title={t("drawerSection.title")}
          description={t("drawerSection.description")}
        />
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <ProgressiveActionDrawer
            triggerLabel={t("drawers.payouts.trigger")}
            title={t("drawers.payouts.title")}
            description={t("drawers.payouts.description")}
            variant="outline"
            width="lg"
          >
            <Suspense fallback={<PayoutSummarySkeleton />}>
              <PayoutSummary userId={userId} />
            </Suspense>
          </ProgressiveActionDrawer>

          <ProgressiveActionDrawer
            triggerLabel={t("drawers.campaigns.trigger")}
            title={t("drawers.campaigns.title")}
            description={t("drawers.campaigns.description")}
            variant="outline"
            width="lg"
          >
            <Suspense fallback={<ActiveCampaignsSkeleton />}>
              <ActiveCampaigns profileId={profileId} />
            </Suspense>
          </ProgressiveActionDrawer>

          <ProgressiveActionDrawer
            triggerLabel={t("drawers.snapshot.trigger")}
            title={t("drawers.snapshot.title")}
            description={t("drawers.snapshot.description")}
            variant="outline"
            width="lg"
          >
            <Suspense fallback={<OperatingSnapshotSkeleton />}>
              <OperatingSnapshot userId={userId} profileId={profileId} />
            </Suspense>
          </ProgressiveActionDrawer>

          <ProgressiveActionDrawer
            triggerLabel={t("drawers.performance.trigger")}
            title={t("drawers.performance.title")}
            description={t("drawers.performance.description")}
            variant="outline"
            width="lg"
          >
            <div className="space-y-5">
              <LiveEarnings />
              <Suspense fallback={<ScoreCardSkeleton />}>
                <ScoreCard creatorProfileId={profileId} variant="compact" />
              </Suspense>
            </div>
          </ProgressiveActionDrawer>

          <ProgressiveActionDrawer
            triggerLabel={t("drawers.submissions.trigger")}
            title={t("drawers.submissions.title")}
            description={t("drawers.submissions.description")}
            variant="outline"
            width="lg"
          >
            <Suspense fallback={<RecentSubmissionsSkeleton />}>
              <RecentSubmissions creatorId={userId} />
            </Suspense>
          </ProgressiveActionDrawer>
        </div>
      </section>
    </div>
  );
}

async function RecentSubmissions({ creatorId }: { creatorId: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard.creator.recentSubmissions");
  const statusT = await getTranslations("dashboard.shared.statuses.submission");
  const recentSubmissions = await prisma.campaignSubmission.findMany({
    where: { creatorId },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <CreatorSectionHeader
        title={t("title")}
        description={t("description")}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">{t("campaign")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("claimedViews")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("earned")}</th>
            </tr>
          </thead>
          <tbody>
            {recentSubmissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-neutral-500">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              recentSubmissions.map((sub) => (
                <tr key={sub.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-950">
                    {sub.campaign.name}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatNumber(sub.claimedViews, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ color: getStatusColor(sub.status), backgroundColor: `${getStatusColor(sub.status)}18` }}
                    >
                      {statusT(sub.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatCurrencyPrecise(sub.earnedAmount, "USD", locale)}
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
