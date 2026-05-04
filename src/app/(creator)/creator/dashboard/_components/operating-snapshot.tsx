import { getActivationStatus } from "@/lib/activation";
import { Skeleton } from "@/components/ui/skeleton";
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
        title="Operating snapshot"
        description="The numbers stay compact so the next action remains obvious."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SoftStat
          label="Total earnings"
          value={`$${payouts.totalEarnings.toFixed(2)}`}
          detail="Approved creator earnings"
        />
        <SoftStat
          label="Active campaigns"
          value={activeCampaignRows.length.toString()}
          detail="Pending, approved, or active"
        />
        <SoftStat
          label="Pending submissions"
          value={pendingSubmissions.toString()}
          detail="Clips awaiting review"
        />
        <SoftStat
          label="Verified platforms"
          value={connectedCount === 0 ? "-" : `${verifiedCount}/${connectedCount}`}
          detail={
            allVerified
              ? "All connected pages verified"
              : "Pages ready for tracking"
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
