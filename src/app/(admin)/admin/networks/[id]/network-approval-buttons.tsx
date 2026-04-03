"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  networkId: string;
  isApproved: boolean;
}

export function NetworkApprovalButtons({ networkId, isApproved }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(approve: boolean) {
    setLoading(true);
    await fetch(`/api/admin/networks/${networkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: approve }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      {!isApproved && (
        <button
          onClick={() => toggle(true)}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 text-white"
          style={{ background: "var(--success)" }}
        >
          Approve
        </button>
      )}
      {isApproved && (
        <button
          onClick={() => toggle(false)}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
        >
          Revoke
        </button>
      )}
    </div>
  );
}
