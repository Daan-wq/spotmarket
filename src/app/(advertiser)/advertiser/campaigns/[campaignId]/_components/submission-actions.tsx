"use client";

import { useState, useTransition } from "react";

interface SubmissionActionsProps {
  submissionId: string;
}

export function SubmissionActions({ submissionId }: SubmissionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  async function handleApprove() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/submissions/${submissionId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error("Error approving submission:", error);
      }
    });
  }

  async function handleReject() {
    if (!rejectionNote.trim()) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/submissions/${submissionId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "REJECTED", rejectionNote }),
        });
        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error("Error rejecting submission:", error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
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
          onClick={() => setShowRejectNote(!showRejectNote)}
          disabled={isPending}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--error)", color: "#ffffff" }}
        >
          Reject
        </button>
      </div>

      {showRejectNote && (
        <div className="mt-2 p-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="Rejection note (required)"
            className="w-full text-xs p-2 rounded mb-2"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            rows={3}
          />
          <button
            onClick={handleReject}
            disabled={isPending || !rejectionNote.trim()}
            className="w-full px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--error)", color: "#ffffff" }}
          >
            {isPending ? "..." : "Confirm Rejection"}
          </button>
        </div>
      )}
    </div>
  );
}
