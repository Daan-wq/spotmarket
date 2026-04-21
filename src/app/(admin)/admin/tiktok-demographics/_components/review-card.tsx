"use client";

import { useState, useTransition } from "react";
import { reviewTikTokDemographic } from "../actions";

interface ReviewCardProps {
  submissionId: string;
  videoUrl: string;
}

export function ReviewCard({ submissionId, videoUrl }: ReviewCardProps) {
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
      try {
        await reviewTikTokDemographic(submissionId, decision, notes);
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
        placeholder="Review notes (optional, shown to creator if rejected)"
        rows={2}
        className="w-full px-3 py-2 rounded-md border text-sm"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => decide("APPROVED")}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: pending ? "var(--text-muted)" : "#16a34a" }}
        >
          Approve
        </button>
        <button
          disabled={pending}
          onClick={() => decide("REJECTED")}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: pending ? "var(--text-muted)" : "var(--error-text)" }}
        >
          Reject
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--error-text)" }}>{error}</p>}
    </div>
  );
}
