"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { SignalSeverity, SignalType } from "@/lib/contracts/signals";

export interface SignalRowData {
  id: string;
  submissionId: string;
  type: SignalType;
  severity: SignalSeverity;
  payload: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
  campaignName: string | null;
  creatorEmail: string | null;
  postUrl: string | null;
  creatorId: string | null;
}

const SEVERITY_STYLE: Record<SignalSeverity, { bg: string; color: string; label: string }> = {
  INFO: { bg: "var(--bg-primary)", color: "var(--text-secondary)", label: "Info" },
  WARN: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Warn" },
  CRITICAL: { bg: "var(--error-bg)", color: "var(--error-text)", label: "Critical" },
};

const TYPE_LABEL: Record<SignalType, string> = {
  VELOCITY_SPIKE: "Velocity spike",
  VELOCITY_DROP: "Velocity drop",
  RATIO_ANOMALY: "Ratio anomaly",
  BOT_SUSPECTED: "Bot suspected",
  LOGO_MISSING: "Logo missing",
  DUPLICATE: "Duplicate",
  TOKEN_BROKEN: "Token broken",
};

function getReason(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const reason = payload.reason;
  return typeof reason === "string" ? reason : "";
}

export function SignalRow({ signal }: { signal: SignalRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resolved, setResolved] = useState(!!signal.resolvedAt);
  const [nudging, setNudging] = useState(false);

  const sev = SEVERITY_STYLE[signal.severity];

  async function resolve() {
    if (pending || resolved) return;
    try {
      const res = await fetch(`/api/admin/signals/${signal.id}/resolve`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to resolve");
        return;
      }
      setResolved(true);
      toast.success("Signal resolved");
      start(() => router.refresh());
    } catch {
      toast.error("Network error");
    }
  }

  async function nudge() {
    if (nudging) return;
    setNudging(true);
    try {
      const res = await fetch(`/api/admin/signals/${signal.id}/nudge`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to nudge creator");
      } else {
        toast.success("Reconnect nudge queued");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setNudging(false);
    }
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", opacity: resolved ? 0.55 : 1 }}>
      <td className="px-4 py-3 text-xs">
        <span
          className="px-2 py-0.5 rounded font-semibold uppercase"
          style={{ background: sev.bg, color: sev.color }}
        >
          {sev.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
        {TYPE_LABEL[signal.type]}
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        {signal.campaignName ?? "—"}
        <br />
        <span className="text-[11px]" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
          {signal.creatorEmail ?? "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", maxWidth: 320 }}>
        {getReason(signal.payload) || "—"}
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        {new Date(signal.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {signal.postUrl && (
            <a
              href={signal.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--primary, var(--accent))" }}
            >
              Post
            </a>
          )}
          <Link
            href={`/admin/submissions?focus=${signal.submissionId}`}
            className="underline"
            style={{ color: "var(--primary, var(--accent))" }}
          >
            View
          </Link>
          {signal.type === "TOKEN_BROKEN" && !resolved && (
            <button
              onClick={nudge}
              disabled={nudging}
              className="px-2 py-1 rounded text-[11px] font-medium"
              style={{ background: "var(--warning-bg)", color: "var(--warning-text)", border: "none", cursor: "pointer" }}
            >
              {nudging ? "..." : "Nudge"}
            </button>
          )}
          {!resolved ? (
            <button
              onClick={resolve}
              disabled={pending}
              className="px-2 py-1 rounded text-[11px] font-medium"
              style={{ background: "var(--success-bg)", color: "var(--success-text)", border: "none", cursor: "pointer" }}
            >
              {pending ? "..." : "Resolve"}
            </button>
          ) : (
            <span className="text-[11px]" style={{ color: "var(--success-text)" }}>
              Resolved
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
