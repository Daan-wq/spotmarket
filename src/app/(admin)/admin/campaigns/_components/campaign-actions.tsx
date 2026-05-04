"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CampaignActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "loading" | "error">("idle");
  const [settleState, setSettleState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleStatusChange() {
    if (isPending) return;
    try {
      const newStatus = status === "active" ? "paused" : "active";
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        toast.error("Failed to update campaign");
        return;
      }
      toast.success(newStatus === "active" ? "Campaign activated" : "Campaign paused");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("[CampaignActions]", err);
      toast.error("Network error");
    }
  }

  async function handleConfirmDelete() {
    setDeleteState("loading");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });

      if (res.status === 409) {
        setDeleteState("error");
        toast.error("Cannot delete: active applications");
        setTimeout(() => setDeleteState("idle"), 3000);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to delete campaign");
      }

      setDeleteState("idle");
      toast.success("Campaign deleted");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("[CampaignActions]", err);
      toast.error("Failed to delete campaign");
      setDeleteState("idle");
    }
  }

  const statusButtonLabel =
    status === "draft" ? "Activate" :
    status === "active" ? "Pause" :
    "Resume";

  async function handleSettle() {
    setSettleState("loading");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/settle`, { method: "POST" });
      if (!res.ok) {
        setSettleState("error");
        toast.error("Settle failed");
        setTimeout(() => setSettleState("idle"), 3000);
        return;
      }
      setSettleState("done");
      toast.success("Campaign settled");
      startTransition(() => router.refresh());
      setTimeout(() => setSettleState("idle"), 2000);
    } catch (err) {
      console.error("[settle]", err);
      setSettleState("error");
      toast.error("Network error");
      setTimeout(() => setSettleState("idle"), 3000);
    }
  }

  const deleteButtonLabel =
    deleteState === "confirming" ? "Confirm delete?" :
    deleteState === "error" ? "Has active applications" :
    "Delete";

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {/* Status button */}
      <button
        onClick={handleStatusChange}
        disabled={isPending}
        style={{
          background: "var(--accent, #534AB7)",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.7 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {isPending ? "…" : statusButtonLabel}
      </button>

      {/* Settle button */}
      <button
        onClick={handleSettle}
        disabled={settleState === "loading"}
        style={{
          background:
            settleState === "done" ? "var(--success-bg, #bbf7d0)" :
            settleState === "error" ? "var(--error-bg, #fecaca)" :
            "#f59e0b",
          color:
            settleState === "done" ? "var(--success-text, #166534)" :
            settleState === "error" ? "var(--error-text, #dc2626)" :
            "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: settleState === "loading" ? "default" : "pointer",
          opacity: settleState === "loading" ? 0.7 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {settleState === "loading" ? "…" :
         settleState === "done" ? "Settled!" :
         settleState === "error" ? "No submissions" :
         "Settle"}
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
