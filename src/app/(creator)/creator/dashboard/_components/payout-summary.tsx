import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { formatCurrencyPrecise } from "@/lib/admin/agency-format";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorSectionHeader } from "../../_components/creator-journey";
import { getCreatorPayoutTotals } from "../_data";

export async function PayoutSummary({ userId }: { userId: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard.creator.payoutSummary");
  const { availableBalance, pendingBalance, profit } =
    await getCreatorPayoutTotals(userId);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <CreatorSectionHeader
        title={t("title")}
        description={t("description")}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniPayout label={t("balance")} value={formatCurrencyPrecise(availableBalance, "EUR", locale)} />
        <MiniPayout
          label={t("pending")}
          value={formatCurrencyPrecise(pendingBalance, "EUR", locale)}
        />
        <MiniPayout label={t("profit")} value={formatCurrencyPrecise(profit, "EUR", locale)} />
      </div>
      <Link
        href="/creator/payouts"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
      >
        {t("openPayments")}
      </Link>
    </div>
  );
}

export function PayoutSummarySkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <Skeleton className="mb-5 h-4 w-40" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
    </div>
  );
}

function MiniPayout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
