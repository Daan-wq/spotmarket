import Link from "next/link";
import { getActivationStatus } from "@/lib/activation";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorSectionHeader } from "../../_components/creator-journey";
import { DashboardAlerts } from "./dashboard-alerts";
import {
  getCreatorPayoutTotals,
  getCreatorPendingCount,
  getCreatorActiveCampaigns,
} from "../_data";

interface NextActionAndAlertsProps {
  userId: string;
  profileId: string;
}

export async function NextActionAndAlerts({
  userId,
  profileId,
}: NextActionAndAlertsProps) {
  const [activation, payouts, pendingSubmissions, activeCampaignRows] =
    await Promise.all([
      getActivationStatus(userId),
      getCreatorPayoutTotals(userId),
      getCreatorPendingCount(userId),
      getCreatorActiveCampaigns(profileId),
    ]);

  const activeCampaigns = activeCampaignRows.length;
  const action = pickNextAction({
    profileComplete: activation.profileComplete,
    accountConnected: activation.accountConnected,
    activeCampaigns,
    pendingSubmissions,
    hasUnpaidBalance: payouts.hasUnpaidBalance,
  });

  return (
    <>
      <DashboardAlerts
        activation={activation}
        hasUnpaidBalance={payouts.hasUnpaidBalance}
      />

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <CreatorSectionHeader
          title="Next best action"
          description="The dashboard chooses one clear move from your activation, campaign, clip, and payout state."
        />
        <div>
          <p className="text-2xl font-semibold text-neutral-950">{action.title}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{action.detail}</p>
          <Link
            href={action.href}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
          >
            Continue
          </Link>
        </div>
      </div>
    </>
  );
}

export function NextActionAndAlertsSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-3 h-7 w-2/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-5 h-11 w-32 rounded-xl" />
    </div>
  );
}

function pickNextAction({
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
  if (!profileComplete)
    return {
      title: "Finish your profile",
      detail: "Campaign eligibility starts with a complete profile.",
      href: "/creator/profile",
    };
  if (!accountConnected)
    return {
      title: "Connect a posting account",
      detail:
        "Connect TikTok, Instagram, YouTube, or Facebook so tracking can work.",
      href: "/creator/connections",
    };
  if (activeCampaigns === 0)
    return {
      title: "Join a campaign",
      detail: "Pick a campaign that matches your platform and payout target.",
      href: "/creator/campaigns",
    };
  if (pendingSubmissions > 0)
    return {
      title: "Check pending clips",
      detail: "Review status, fixes, and earnings from your submitted clips.",
      href: "/creator/videos",
    };
  if (hasUnpaidBalance)
    return {
      title: "Review payout status",
      detail: "Approved earnings are ready to track in Payments.",
      href: "/creator/payouts",
    };
  return {
    title: "Submit another clip",
    detail: "Open a joined campaign and send the next post URL.",
    href: "/creator/campaigns",
  };
}
