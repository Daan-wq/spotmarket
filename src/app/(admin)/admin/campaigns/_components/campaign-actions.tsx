"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CampaignActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "loading" | "error">("idle");

  function handleStatusChange() {
    if (isPending) return;
    const newStatus = optimisticStatus === "active" ? "paused" : "active";

    startTransition(async () => {
      setOptimisticStatus(newStatus);

      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          toast.error("Campagne bijwerken mislukt - teruggedraaid");
          return;
        }
        toast.success(newStatus === "active" ? "Campagne geactiveerd" : "Campagne gepauzeerd");
        router.refresh();
      } catch (err) {
        console.error("[CampaignActions]", err);
        toast.error("Netwerkfout - teruggedraaid");
      }
    });
  }

  function handleConfirmDelete() {
    setDeleteState("loading");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });

        if (res.status === 409) {
          setDeleteState("error");
          toast.error("Kan niet verwijderen: actieve aanmeldingen");
          setTimeout(() => setDeleteState("idle"), 3000);
          return;
        }

        if (!res.ok) {
          throw new Error("Campagne verwijderen mislukt");
        }

        setDeleteState("idle");
        toast.success("Campagne verwijderd");
        router.refresh();
      } catch (err) {
        console.error("[CampaignActions]", err);
        toast.error("Campagne verwijderen mislukt");
        setDeleteState("idle");
      }
    });
  }

  const statusButtonLabel =
    optimisticStatus === "draft" ? "Activate" :
    optimisticStatus === "active" ? "Pause" :
    "Resume";

  const deleteButtonLabel =
    deleteState === "confirming" ? "Confirm delete?" :
    deleteState === "error" ? "Has active applications" :
    "Verwijderen";

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
        {deleteState === "loading" ? "..." : deleteButtonLabel}
      </button>
    </div>
  );
}
