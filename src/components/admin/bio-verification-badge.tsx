"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BioVerificationBadgeProps {
  verificationId?: string;
  code?: string;
  status?: "PENDING" | "VERIFIED" | "FAILED" | null;
  applicationId: string;
  socialAccountId: string;
}

export function BioVerificationBadge({
  verificationId,
  code,
  status,
  applicationId,
  socialAccountId,
}: BioVerificationBadgeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generateCode() {
    setLoading(true);
    try {
      await fetch("/api/admin/bio-verification/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, socialAccountId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function checkCode() {
    if (!verificationId) return;
    setLoading(true);
    try {
      await fetch("/api/admin/bio-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!status || !code) {
    return (
      <button
        onClick={generateCode}
        disabled={loading}
        className="text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer disabled:opacity-50"
        style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        {loading ? "..." : "Verify Bio"}
      </button>
    );
  }

  if (status === "VERIFIED") {
    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1"
        style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Verified
      </span>
    );
  }

  const badgeStyle = status === "PENDING"
    ? { background: "var(--warning-bg)", color: "var(--warning-text)" }
    : { background: "var(--error-bg)", color: "var(--error-text)" };

  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={badgeStyle}>
        {code}
      </code>
      <button
        onClick={checkCode}
        disabled={loading}
        className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer disabled:opacity-50"
        style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
      >
        {loading ? "..." : "Check"}
      </button>
    </span>
  );
}
