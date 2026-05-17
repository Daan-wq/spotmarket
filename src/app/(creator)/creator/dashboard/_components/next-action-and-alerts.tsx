import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getActivationStatus } from "@/lib/activation";
import { Skeleton } from "@/components/ui/skeleton";
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
  const t = await getTranslations("dashboard.creator.nextAction");
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

      <section className="border-y border-neutral-200 py-7">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {t("eyebrow")}
          </p>
          <p className="text-2xl font-semibold text-neutral-950">
            {t(`${action.key}.title`)}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {t(`${action.key}.detail`)}
          </p>
          <Link
            href={action.href}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
          >
            {t("cta")}
          </Link>
        </div>
      </section>
    </>
  );
}

export function NextActionAndAlertsSkeleton() {
  return (
    <div className="border-y border-neutral-200 py-7">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-3 h-7 w-2/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-5 h-11 w-32 rounded-xl" />
    </div>
  );
}

type NextActionKey =
  | "finishProfile"
  | "connectAccount"
  | "joinCampaign"
  | "checkPendingClips"
  | "reviewPayoutStatus"
  | "submitAnotherClip";

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
      key: "finishProfile" satisfies NextActionKey,
      href: "/creator/profile",
    };
  if (!accountConnected)
    return {
      key: "connectAccount" satisfies NextActionKey,
      href: "/creator/connections",
    };
  if (activeCampaigns === 0)
    return {
      key: "joinCampaign" satisfies NextActionKey,
      href: "/creator/campaigns",
    };
  if (pendingSubmissions > 0)
    return {
      key: "checkPendingClips" satisfies NextActionKey,
      href: "/creator/videos",
    };
  if (hasUnpaidBalance)
    return {
      key: "reviewPayoutStatus" satisfies NextActionKey,
      href: "/creator/payouts",
    };
  return {
    key: "submitAnotherClip" satisfies NextActionKey,
    href: "/creator/campaigns",
  };
}
