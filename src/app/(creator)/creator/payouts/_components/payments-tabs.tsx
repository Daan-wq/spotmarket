"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { CreatorSectionHeader } from "../../_components/creator-journey";
import { WithdrawTab } from "./withdraw-tab";

interface PaymentsTabsProps {
  overviewSlot: ReactNode;
  historySlot: ReactNode;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  pendingPayout: number;
  hasPaymentMethod: boolean;
}

const TAB_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "withdraw", label: "Withdraw" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TAB_ITEMS)[number]["key"];

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
    ? `$${balance.toFixed(2)} available to withdraw`
    : pendingPayout > 0
      ? `$${pendingPayout.toFixed(2)} already processing`
      : totalEarned > 0
        ? `$${totalEarned.toFixed(2)} approved so far`
        : "No approved balance yet";

  return (
    <div className="space-y-8">
      {!hasPaymentMethod && balance > 0 ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800">
          Add a withdrawal destination before requesting your next payout.
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <CreatorSectionHeader
            title="Payment workspace"
            description={`${paymentFocus}. Paid out: $${totalPaid.toFixed(2)}.`}
          />
          <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            {TAB_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleChange(item.key)}
                className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                  tab === item.key ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-950"
                }`}
              >
                {item.label}
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
