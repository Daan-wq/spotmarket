"use client";

import { useOptimistic, useTransition } from "react";
import { updateNotifications } from "./actions";

interface Props {
  initialCampaignAlerts: boolean;
  initialPayoutAlerts: boolean;
}

export function NotificationsForm({ initialCampaignAlerts, initialPayoutAlerts }: Props) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic({
    notifyCampaignAlerts: initialCampaignAlerts,
    notifyPayoutAlerts: initialPayoutAlerts,
  });

  function toggle(field: "notifyCampaignAlerts" | "notifyPayoutAlerts") {
    const next = { ...optimistic, [field]: !optimistic[field] };
    startTransition(async () => {
      setOptimistic(next);
      const fd = new FormData();
      fd.set("notifyCampaignAlerts", String(next.notifyCampaignAlerts));
      fd.set("notifyPayoutAlerts", String(next.notifyPayoutAlerts));
      await updateNotifications(fd);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">Notifications</p>
        <p className="text-xs text-gray-400 mt-0.5">Choose which email alerts you receive.</p>
      </div>
      <div className="divide-y divide-gray-50">
        <ToggleRow
          label="Campaign alerts"
          description="When a campaign you applied to changes status"
          checked={optimistic.notifyCampaignAlerts}
          onToggle={() => toggle("notifyCampaignAlerts")}
        />
        <ToggleRow
          label="Payout alerts"
          description="When a payout is processed to your account"
          checked={optimistic.notifyPayoutAlerts}
          onToggle={() => toggle("notifyPayoutAlerts")}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
          checked ? "bg-purple-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
