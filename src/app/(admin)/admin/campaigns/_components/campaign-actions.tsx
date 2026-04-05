"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CampaignActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "loading" | "error">("idle");

  async function handleStatusChange() {
    setStatusLoading(true);
    try {
      const newStatus = status === "active" ? "paused" : "active";
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update campaign");
      }

      setStatusLoading(false);
      router.refresh();
    } catch (err) {
      console.error("[CampaignActions]", err);
      setStatusLoading(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleteState("loading");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });

      if (res.status === 409) {
        setDeleteState("error");
        setTimeout(() => setDeleteState("idle"), 3000);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to delete campaign");
      }

      setDeleteState("idle");
      router.refresh();
    } catch (err) {
      console.error("[CampaignActions]", err);
      setDeleteState("idle");
    }
  }

  const statusButtonLabel =
    status === "draft" ? "Activate" :
    status === "active" ? "Pause" :
    "Resume";

  const deleteButtonLabel =
    deleteState === "confirming" ? "Confirm delete?" :
    deleteState === "error" ? "Has active applications" :
    "Delete";

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {/* Status button */}
      <button
        onClick={handleStatusChange}
        disabled={statusLoading}
        style={{
          background: "var(--accent, #534AB7)",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: statusLoading ? "default" : "pointer",
          opacity: statusLoading ? 0.7 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {statusLoading ? "…" : statusButtonLabel}
      </button>

      {/* Delete button */}
      <button
        onClick={() => {
          if (deleteState === "idle") {
            setDeleteState("confirming");
            setTimeout(() => setDeleteState("idle"), 2000);
          } else if (deleteState === "confirming") {
            handleConfirmDelete();
          }
        }}
        disabled={deleteState === "loading"}
        style={{
          background:
            deleteState === "error" ? "var(--error-bg, #fecaca)" :
            deleteState === "confirming" ? "var(--warning-bg, #fed7aa)" :
            "#ef4444",
          color:
            deleteState === "error" ? "var(--error-text, #dc2626)" :
            deleteState === "confirming" ? "var(--warning-text, #92400e)" :
            "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: deleteState === "loading" ? "default" : "pointer",
          opacity: deleteState === "loading" ? 0.7 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {deleteState === "loading" ? "…" : deleteButtonLabel}
      </button>
    </div>
  );
}
