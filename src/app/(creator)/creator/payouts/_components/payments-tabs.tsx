"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { WithdrawTab } from "./withdraw-tab";

interface PaymentsTabsProps {
  overviewSlot: React.ReactNode;
  historySlot: React.ReactNode;
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

export function PaymentsTabs({ overviewSlot, historySlot }: PaymentsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(isTabKey(initial) ? initial : "overview");

  function handleChange(next: string) {
    if (!isTabKey(next)) return;
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <Tabs items={TAB_ITEMS as unknown as Array<{ key: string; label: string }>} value={tab} onChange={handleChange} />

      {tab === "overview" && overviewSlot}
      {tab === "withdraw" && <WithdrawTab />}
      {tab === "history" && historySlot}
    </div>
  );
}
