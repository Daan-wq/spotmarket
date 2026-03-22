"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { PagePickerModal } from "@/components/marketplace/page-picker-modal";
import type { SocialAccount, Campaign } from "@prisma/client";

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
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ campaign: Campaign; pages: SocialAccount[] } | null>(null);

  if (applicationStatus) {
    return (
      <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${STATUS_STYLES[applicationStatus]}`}>
        {STATUS_LABELS[applicationStatus]}
      </span>
    );
  }

  async function handleClaimClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/claim`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load campaign");
      }

      const data = await res.json();
      setModalData(data);
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleModalSubmit(selectedPageIds: string[]) {
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPageIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to claim campaign");
      }

      setShowModal(false);
      setModalData(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <button
        onClick={handleClaimClick}
        disabled={loading}
        className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {loading ? "Loading..." : "Claim"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 text-right">{error}</p>}

      {showModal && modalData && (
        <PagePickerModal
          campaign={modalData.campaign}
          pages={modalData.pages}
          onSubmit={handleModalSubmit}
          onCancel={() => {
            setShowModal(false);
            setModalData(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
