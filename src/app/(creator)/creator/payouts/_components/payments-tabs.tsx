"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { CreatorSectionHeader } from "../../_components/creator-journey";
import { WithdrawTab } from "./withdraw-tab";
import { formatCurrency } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";

interface PaymentsTabsProps {
  overviewSlot: ReactNode;
  historySlot: ReactNode;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  pendingPayout: number;
  hasPaymentMethod: boolean;
}

const TAB_ITEMS = ["overview", "withdraw", "history"] as const;

type TabKey = (typeof TAB_ITEMS)[number];

function isTabKey(value: string | null): value is TabKey {
  return value === "overview" || value === "withdraw" || value === "history";
}

export function PaymentsTabs({
  overviewSlot,
  historySlot,
  totalEarned,
  totalPaid,
  balance,
  pendingPayout,
  hasPaymentMethod,
}: PaymentsTabsProps) {
  const locale = useLocale();
  const t = useTranslations("creator.payouts.tabs");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(isTabKey(initial) ? initial : "overview");

  function handleChange(next: TabKey) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const paymentFocus = balance > 0
    ? t("focusAvailable", { amount: formatCurrency(balance, locale) })
    : pendingPayout > 0
      ? t("focusProcessing", { amount: formatCurrency(pendingPayout, locale) })
      : totalEarned > 0
        ? t("focusApproved", { amount: formatCurrency(totalEarned, locale) })
        : t("focusNone");

  return (
    <div className="space-y-8">
      {!hasPaymentMethod && balance > 0 ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800">
          <span>{t("missingDestination")}</span>{" "}
          <Link
            href="/creator/settings#payout-settings"
            className="font-semibold underline-offset-2 hover:underline"
          >
            {t("missingDestinationCta")}
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <CreatorSectionHeader
            title={t("title")}
            description={`${paymentFocus}. ${t("paidOut", { amount: formatCurrency(totalPaid, locale) })}`}
          />
          <div className="inline-flex w-full rounded-xl border border-neutral-200 bg-neutral-50 p-1 md:w-auto">
            {TAB_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleChange(item)}
                className={`h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition md:flex-none ${
                  tab === item ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-950"
                }`}
              >
                {t(item)}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && overviewSlot}
        {tab === "withdraw" && <WithdrawTab />}
        {tab === "history" && historySlot}
      </section>
    </div>
  );
}
