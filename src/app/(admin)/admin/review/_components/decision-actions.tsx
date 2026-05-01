"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  kind: "demographics" | "applications";
  id: string;
  /** If true, skip the rejection-reason modal — used when reason is already in scope (e.g. video review). */
  disabled?: boolean;
}

export function DecisionActions({ kind, id, disabled = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function send(decision: "APPROVE" | "REJECT", reasonText?: string) {
    const res = await fetch(`/api/admin/review/${kind}/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason: reasonText }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Request failed" }));
      toast.error(error || "Request failed");
      return;
    }
    toast.success(decision === "APPROVE" ? "Approved" : "Rejected");
    setShowReject(false);
    setReason("");
    startTransition(() => router.refresh());
  }

  if (disabled) {
    return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => send("APPROVE")}
          disabled={pending}
          className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
          style={{ background: "var(--success-bg)", color: "var(--success-text)", opacity: pending ? 0.5 : 1 }}
        >
          {pending ? "…" : "Approve"}
        </button>
        <button
          onClick={() => setShowReject(true)}
          disabled={pending}
          className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
          style={{ background: "var(--error-bg)", color: "var(--error-text)", opacity: pending ? 0.5 : 1 }}
        >
          Reject
        </button>
      </div>

      {showReject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => !pending && setShowReject(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Reject submission
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              The creator will see this reason in-app and via Discord DM.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Numbers don't match the screen recording. Resubmit with the correct overview."
              rows={4}
              autoFocus
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowReject(false)}
                disabled={pending}
                className="flex-1 px-3 py-2 rounded-md text-sm font-medium border cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => send("REJECT", reason.trim())}
                disabled={pending || !reason.trim()}
                className="flex-1 px-3 py-2 rounded-md text-sm font-semibold text-white cursor-pointer"
                style={{ background: "var(--error-text)", opacity: pending || !reason.trim() ? 0.5 : 1 }}
              >
                {pending ? "Rejecting…" : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
