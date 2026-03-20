"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";

interface CampaignApplyButtonProps {
  campaignId: string;
  creatorProfileId: string;
  applicationStatus?: ApplicationStatus;
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  completed: "Completed",
  disputed: "Disputed",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-700",
  disputed: "bg-orange-100 text-orange-700",
};

export function CampaignApplyButton({
  campaignId,
  applicationStatus,
}: CampaignApplyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (applicationStatus) {
    return (
      <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${STATUS_STYLES[applicationStatus]}`}>
        {STATUS_LABELS[applicationStatus]}
      </span>
    );
  }

  async function handleApply() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/applications`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to apply");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleApply}
        disabled={loading}
        className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {loading ? "Applying..." : "Apply"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 text-right">{error}</p>}
    </div>
  );
}
