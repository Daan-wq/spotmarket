"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  revieweeId: string;
  campaignId: string;
  campaignName: string;
}

export function ReviewForm({ revieweeId, campaignId, campaignName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = submitting || isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || loading) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${revieweeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, rating, text: text || undefined }),
      });

      if (res.ok) {
        setDone(true);
        startTransition(() => router.refresh());
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to submit review");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Review submitted!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Rate your experience with <span className="font-bold">{campaignName}</span>
      </p>

      <form onSubmit={submit} className="space-y-3">
        {/* Star selector */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="text-2xl cursor-pointer transition-transform hover:scale-110"
            >
              <span style={{ color: star <= (hovered || rating) ? "#f59e0b" : "var(--muted)" }}>★</span>
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Share your experience (optional)..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg resize-none outline-none"
          style={{ background: "var(--muted)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        />

        {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !rating}
          className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--text-primary)" }}
        >
          {loading ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
