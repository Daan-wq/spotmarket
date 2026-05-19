import { getLocale, getTranslations } from "next-intl/server";
import { getActivationStatus } from "@/lib/activation";
import type { Locale } from "@/i18n/routing";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyPrecise, formatNumber } from "@/lib/admin/agency-format";
import {
  CreatorSectionHeader,
  SoftStat,
} from "../../_components/creator-journey";
import {
  getCreatorActiveCampaigns,
  getCreatorPayoutTotals,
  getCreatorPendingCount,
  getCreatorPlatformVerification,
} from "../_data";

interface OperatingSnapshotProps {
  userId: string;
  profileId: string;
}

export async function OperatingSnapshot({
  userId,
  profileId,
}: OperatingSnapshotProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard.creator.operatingSnapshot");
  const [payouts, activeCampaignRows, pendingSubmissions, platforms] =
    await Promise.all([
      getCreatorPayoutTotals(userId),
      getCreatorActiveCampaigns(profileId),
      getCreatorPendingCount(userId),
      getCreatorPlatformVerification(profileId),
    ]);

  // Touch activation cache so its DB hit is reused across boundaries.
  // This call is React.cache-deduped against NextActionAndAlerts.
  await getActivationStatus(userId);

  const { connectedCount, verifiedCount, allVerified } = platforms;

  return (
    <section>
      <CreatorSectionHeader
        title={t("title")}
        description={t("description")}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SoftStat
          label={t("totalEarnings")}
          value={formatCurrencyPrecise(payouts.totalEarnings, "EUR", locale)}
          detail={t("totalEarningsDetail")}
        />
        <SoftStat
          label={t("activeCampaigns")}
          value={formatNumber(activeCampaignRows.length, locale)}
          detail={t("activeCampaignsDetail")}
        />
        <SoftStat
          label={t("pendingSubmissions")}
          value={formatNumber(pendingSubmissions, locale)}
          detail={t("pendingSubmissionsDetail")}
        />
        <SoftStat
          label={t("verifiedPlatforms")}
          value={
            connectedCount === 0
              ? "-"
              : `${formatNumber(verifiedCount, locale)}/${formatNumber(connectedCount, locale)}`
          }
          detail={
            allVerified
              ? t("allVerified")
              : t("readyForTracking")
          }
        />
      </div>
    </section>
  );
}

export function OperatingSnapshotSkeleton() {
  return (
    <section>
      <Skeleton className="mb-5 h-4 w-48" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </section>
  );
}
