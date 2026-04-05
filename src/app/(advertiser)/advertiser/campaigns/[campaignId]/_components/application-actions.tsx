"use client";

import { useTransition } from "react";

interface ApplicationActionsProps {
  applicationId: string;
}

export function ApplicationActions({ applicationId }: ApplicationActionsProps) {
  const [isPending, startTransition] = useTransition();

  async function handleApprove() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/campaigns/applications/${applicationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error("Error approving application:", error);
      }
    });
  }

  async function handleReject() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/campaigns/applications/${applicationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error("Error rejecting application:", error);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="px-3 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#ffffff" }}
      >
        {isPending ? "..." : "Approve"}
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="px-3 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "var(--error)", color: "#ffffff" }}
      >
        {isPending ? "..." : "Reject"}
      </button>
    </div>
  );
}
