"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface RejectionPayload {
  notificationId: string;
  type: "SUBMISSION_REJECTED" | "APPLICATION_REJECTED" | "DEMOGRAPHICS_REJECTED";
  rejectionNote: string;
  reference: string | null;  // campaign name or @handle
  supportUrl: string;
}

const TITLES: Record<RejectionPayload["type"], string> = {
  SUBMISSION_REJECTED: "Your video submission was rejected",
  APPLICATION_REJECTED: "Your campaign join request was rejected",
  DEMOGRAPHICS_REJECTED: "Your TikTok demographics submission was rejected",
};

export function RejectionAlertDialog({ payload }: { payload: RejectionPayload }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const acknowledge = async () => {
    try {
      await fetch(`/api/notifications/${payload.notificationId}/acknowledge`, {
        method: "PATCH",
      });
    } finally {
      setOpen(false);
      startTransition(() => router.refresh());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="rounded-xl p-6 max-w-md w-full shadow-2xl border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--error-bg)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--error-text)" }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {TITLES[payload.type]}
          </h3>
        </div>

        {payload.reference && (
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            {payload.reference}
          </p>
        )}

        <div
          className="rounded-md p-3 mb-4 text-sm"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {payload.rejectionNote || "No reason provided."}
        </div>

        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Need help? Open a support ticket in our Discord and our team will get back to you.
        </p>

        <div className="flex gap-2">
          <a
            href={payload.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center transition-all hover:opacity-90"
            style={{ background: "#5865F2" }}
          >
            Open support ticket
          </a>
          <button
            onClick={acknowledge}
            disabled={pending}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", opacity: pending ? 0.5 : 1 }}
          >
            {pending ? "…" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
