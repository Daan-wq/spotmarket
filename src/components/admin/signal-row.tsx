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
  creatorProfileId: string | null;
}

const SEVERITY_STYLE: Record<SignalSeverity, { bg: string; color: string; label: string }> = {
  INFO: { bg: "var(--bg-primary)", color: "var(--text-secondary)", label: "Info" },
  WARN: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Waarschuwing" },
  CRITICAL: { bg: "var(--error-bg)", color: "var(--error-text)", label: "Kritiek" },
};

const TYPE_LABEL: Record<SignalType, string> = {
  VELOCITY_SPIKE: "Oud signaal",
  VELOCITY_DROP: "Snelheidsdaling",
  RATIO_ANOMALY: "Ratio-afwijking",
  BOT_SUSPECTED: "Botverdenking",
  LOGO_MISSING: "Logo ontbreekt",
  DUPLICATE: "Dubbel",
  TOKEN_BROKEN: "Token stuk",
};

function getReason(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const reason = payload.reason;
  return typeof reason === "string" ? translateSignalReason(reason) : "";
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
        toast.error("Oplossen mislukt");
        return;
      }
      setResolved(true);
      toast.success("Signaal opgelost");
      start(() => router.refresh());
    } catch {
      toast.error("Netwerkfout");
    }
  }

  async function nudge() {
    if (nudging) return;
    setNudging(true);
    try {
      const res = await fetch(`/api/admin/signals/${signal.id}/nudge`, { method: "POST" });
      if (!res.ok) {
        toast.error("Herinnering sturen mislukt");
      } else {
        toast.success("Herinnering voor opnieuw koppelen klaargezet");
      }
    } catch {
      toast.error("Netwerkfout");
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
        {signal.campaignName ?? "-"}
        <br />
        <span className="text-[11px]" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
          {signal.creatorEmail ?? "-"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)", maxWidth: 320 }}>
        {getReason(signal.payload) || "-"}
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        {new Date(signal.createdAt).toLocaleString("nl-NL")}
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
            Bekijken
          </Link>
          {signal.type === "TOKEN_BROKEN" && !resolved && (
            <button
              onClick={nudge}
              disabled={nudging}
              className="px-2 py-1 rounded text-[11px] font-medium"
              style={{ background: "var(--warning-bg)", color: "var(--warning-text)", border: "none", cursor: "pointer" }}
            >
              {nudging ? "..." : "Herinneren"}
            </button>
          )}
          {!resolved ? (
            <button
              onClick={resolve}
              disabled={pending}
              className="px-2 py-1 rounded text-[11px] font-medium"
              style={{ background: "var(--success-bg)", color: "var(--success-text)", border: "none", cursor: "pointer" }}
            >
              {pending ? "..." : "Oplossen"}
            </button>
          ) : (
            <span className="text-[11px]" style={{ color: "var(--success-text)" }}>
              Opgelost
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function SignalActions({ signal }: { signal: SignalRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resolved, setResolved] = useState(!!signal.resolvedAt);
  const [nudging, setNudging] = useState(false);

  async function resolve() {
    if (pending || resolved) return;
    try {
      const res = await fetch(`/api/admin/signals/${signal.id}/resolve`, { method: "POST" });
      if (!res.ok) {
        toast.error("Oplossen mislukt");
        return;
      }
      setResolved(true);
      toast.success("Signaal opgelost");
      start(() => router.refresh());
    } catch {
      toast.error("Netwerkfout");
    }
  }

  async function nudge() {
    if (nudging) return;
    setNudging(true);
    try {
      const res = await fetch(`/api/admin/signals/${signal.id}/nudge`, { method: "POST" });
      if (!res.ok) {
        toast.error("Herinnering sturen mislukt");
      } else {
        toast.success("Herinnering voor opnieuw koppelen klaargezet");
      }
    } catch {
      toast.error("Netwerkfout");
    } finally {
      setNudging(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {signal.postUrl ? (
        <a
          href={signal.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-50"
        >
          Post
        </a>
      ) : null}
      <Link
        href={`/admin/submissions?focus=${signal.submissionId}`}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-50"
      >
        Bekijken
      </Link>
      {signal.type === "BOT_SUSPECTED" ? (
        <Link
          href={`/admin/signals/${signal.id}`}
          className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
        >
          Bot beoordelen
        </Link>
      ) : null}
      {signal.creatorProfileId ? (
        <Link
          href={`/admin/creators/${signal.creatorProfileId}`}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-50"
        >
          Maker
        </Link>
      ) : null}
      {signal.type === "TOKEN_BROKEN" && !resolved ? (
        <button
          onClick={nudge}
          disabled={nudging}
          className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 disabled:opacity-60"
        >
          {nudging ? "..." : "Herinneren"}
        </button>
      ) : null}
      {!resolved ? (
        <button
          onClick={resolve}
          disabled={pending}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-60"
        >
          {pending ? "..." : "Oplossen"}
        </button>
      ) : (
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          Opgelost
        </span>
      )}
    </div>
  );
}

function translateSignalReason(reason: string) {
  return reason
    .replace("Anti-bot risk", "Anti-bot risico")
    .replace("Token expired", "Token verlopen")
    .replace("Token broken", "Token stuk")
    .replace("low engagement on high view delta", "lage engagement bij hoge viewgroei");
}
