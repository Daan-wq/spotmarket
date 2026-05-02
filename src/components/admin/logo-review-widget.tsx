"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

export type LogoVerdict = "PENDING" | "PRESENT" | "MISSING";

interface LogoReviewWidgetProps {
  submissionId: string;
  thumbnailUrl: string | null;
  postUrl: string | null;
  initialStatus: LogoVerdict;
  initialVerifiedAt: string | null;
  initialVerifiedBy: string | null;
}

export function LogoReviewWidget({
  submissionId,
  thumbnailUrl,
  postUrl,
  initialStatus,
  initialVerifiedAt,
  initialVerifiedBy,
}: LogoReviewWidgetProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<LogoVerdict>(initialStatus);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(initialVerifiedAt);
  const [verifiedBy, setVerifiedBy] = useState<string | null>(initialVerifiedBy);

  async function setVerdict(verdict: "PRESENT" | "MISSING") {
    if (pending) return;
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}/logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoStatus: verdict }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Failed to update logo status");
        return;
      }
      const data = await res.json();
      setStatus(verdict);
      setVerifiedAt(data.logoVerifiedAt ?? new Date().toISOString());
      setVerifiedBy(data.logoVerifiedBy ?? null);
      toast.success(verdict === "PRESENT" ? "Logo confirmed present" : "Logo marked missing — signal raised");
      start(() => router.refresh());
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div
      className="rounded-lg p-3 flex gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div
        className="shrink-0 rounded-md overflow-hidden flex items-center justify-center"
        style={{ width: 96, height: 96, background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        {thumbnailUrl ? (
          // Use a plain img to avoid Next image-domain config friction for arbitrary CDN hosts
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt="Submission thumbnail"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span className="text-[10px] text-center px-2" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
            No thumbnail
          </span>
        )}
        {/* Suppress unused import warning */}
        {false && <Image src="" alt="" width={1} height={1} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-secondary)" }}>
            Logo verification
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{
              background:
                status === "PRESENT"
                  ? "var(--success-bg)"
                  : status === "MISSING"
                  ? "var(--error-bg)"
                  : "var(--warning-bg)",
              color:
                status === "PRESENT"
                  ? "var(--success-text)"
                  : status === "MISSING"
                  ? "var(--error-text)"
                  : "var(--warning-text)",
            }}
          >
            {status}
          </span>
        </div>
        {verifiedAt && (
          <p className="text-[11px] mb-2" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
            Verified {new Date(verifiedAt).toLocaleString()}
            {verifiedBy ? ` · by ${verifiedBy.slice(0, 8)}` : ""}
          </p>
        )}
        {postUrl && (
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] underline block mb-2"
            style={{ color: "var(--primary, var(--accent))" }}
          >
            Open post →
          </a>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setVerdict("PRESENT")}
            disabled={pending}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{
              background: status === "PRESENT" ? "var(--success-text)" : "var(--success-bg)",
              color: status === "PRESENT" ? "#fff" : "var(--success-text)",
              border: "none",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
          >
            ✓ Logo present
          </button>
          <button
            onClick={() => setVerdict("MISSING")}
            disabled={pending}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{
              background: status === "MISSING" ? "var(--error-text)" : "var(--error-bg)",
              color: status === "MISSING" ? "#fff" : "var(--error-text)",
              border: "none",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
          >
            ✕ Logo missing
          </button>
        </div>
      </div>
    </div>
  );
}
