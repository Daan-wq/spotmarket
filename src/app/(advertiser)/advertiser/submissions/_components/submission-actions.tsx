"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubmissionActionsProps {
  submissionId: string;
  status: string;
}

export default function SubmissionActions({ submissionId, status }: SubmissionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  async function handleApprove() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (res.ok) {
        router.refresh();
        setShowRejectForm(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionNote }),
      });
      if (res.ok) {
        router.refresh();
        setShowRejectForm(false);
        setRejectionNote("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (status !== "PENDING") {
    return <span style={{ color: "var(--text-secondary)" }}>-</span>;
  }

  if (showRejectForm) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          placeholder="Rejection reason (optional)"
          value={rejectionNote}
          onChange={(e) => setRejectionNote(e.target.value)}
          disabled={loading}
          className="text-xs p-2 rounded border"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          }}
          rows={2}
        />
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={loading}
            style={{
              fontSize: "12px",
              padding: "4px 8px",
              background: "var(--error-bg)",
              color: "var(--error-text)",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Rejecting..." : "Confirm Reject"}
          </button>
          <button
            onClick={() => {
              setShowRejectForm(false);
              setRejectionNote("");
            }}
            disabled={loading}
            style={{
              fontSize: "12px",
              padding: "4px 8px",
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        style={{
          fontSize: "12px",
          padding: "4px 8px",
          background: "var(--success-bg)",
          color: "var(--success-text)",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Loading..." : "Approve"}
      </button>
      <button
        onClick={() => setShowRejectForm(true)}
        disabled={loading}
        style={{
          fontSize: "12px",
          padding: "4px 8px",
          background: "var(--error-bg)",
          color: "var(--error-text)",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        Reject
      </button>
    </div>
  );
}
