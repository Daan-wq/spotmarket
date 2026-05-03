"use client";

import { useState, useTransition } from "react";
import { reviewTikTokDemographic } from "../actions";

interface ReviewCardProps {
  submissionId: string;
  videoUrl: string;
}

const MIN_REASON_LENGTH = 10;

export function ReviewCard({ submissionId, videoUrl }: ReviewCardProps) {
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reasonValid = notes.trim().length >= MIN_REASON_LENGTH;

  const decide = (decision: "APPROVED" | "REJECTED") => {
    setError(null);
    if (decision === "REJECTED" && !reasonValid) {
      setError(`Decline reason must be at least ${MIN_REASON_LENGTH} characters.`);
      return;
    }
    startTransition(async () => {
      try {
        await reviewTikTokDemographic(submissionId, decision, notes.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Review failed");
      }
    });
  };

  return (
    <div className="space-y-3">
      <video
        src={videoUrl}
        controls
        className="w-full rounded-md border"
        style={{ borderColor: "var(--border)", maxHeight: 360 }}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={`Decline reason (required, min ${MIN_REASON_LENGTH} chars). Optional for approval.`}
        rows={3}
        className="w-full px-3 py-2 rounded-md border text-sm"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => decide("APPROVED")}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed"
          style={{ background: pending ? "var(--text-muted)" : "#16a34a", opacity: pending ? 0.6 : 1 }}
        >
          Approve
        </button>
        <button
          disabled={pending || !reasonValid}
          onClick={() => decide("REJECTED")}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed"
          style={{
            background: pending || !reasonValid ? "var(--text-muted)" : "var(--error-text)",
            opacity: pending || !reasonValid ? 0.6 : 1,
          }}
        >
          Decline
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--error-text)" }}>{error}</p>}
    </div>
  );
}
