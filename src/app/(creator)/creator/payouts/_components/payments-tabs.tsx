"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  CreatorJourney,
  CreatorSectionHeader,
  type JourneyStepItem,
} from "../../_components/creator-journey";
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

  const steps: JourneyStepItem[] = [
    {
      id: "earned",
      label: "Earn approved balance",
      description: "Approved clips create the balance that can later be withdrawn.",
      status: totalEarned > 0 ? "complete" : "current",
      meta: `$${totalEarned.toFixed(2)} total approved`,
      cta: { label: "Show overview", onClick: () => handleChange("overview") },
    },
    {
      id: "withdraw",
      label: "Request withdrawal",
      description: "Withdraw from the dedicated step once your balance and destination are ready.",
      status: balance > 0 ? "current" : pendingPayout > 0 ? "complete" : "blocked",
      meta: balance > 0 ? `$${balance.toFixed(2)} available` : pendingPayout > 0 ? `$${pendingPayout.toFixed(2)} processing` : "No available balance yet",
      cta: balance > 0 || pendingPayout > 0 ? { label: "Open withdraw", onClick: () => handleChange("withdraw") } : undefined,
    },
    {
      id: "history",
      label: "Track payout history",
      description: "Confirmed, sent, pending, and failed payouts stay in one reviewable list.",
      status: totalPaid > 0 ? "complete" : pendingPayout > 0 ? "current" : "idle",
      meta: totalPaid > 0 ? `$${totalPaid.toFixed(2)} paid out` : "History appears after payouts",
      cta: { label: "Show history", onClick: () => handleChange("history") },
    },
  ];

  return (
    <div className="space-y-8">
      <CreatorJourney
        title="Money moves in order"
        description="The Payments page now follows the payout flow instead of starting with disconnected tabs."
        steps={steps}
      />

      {!hasPaymentMethod && balance > 0 ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800">
          Add a withdrawal destination before requesting your next payout.
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <CreatorSectionHeader
            title="Payment workspace"
            description="Use the active step below when you need the details."
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
