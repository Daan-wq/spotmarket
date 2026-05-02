"use client";

import { useState, useTransition } from "react";
import type { NotificationType, NotificationChannel } from "@prisma/client";

interface RuleRow {
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  isDefault: boolean;
}

const ALL_CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL", "DISCORD"];

const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  CAMPAIGN_LAUNCHED: "New campaign launched",
  SUBMISSION_APPROVED: "Submission approved",
  SUBMISSION_REJECTED: "Submission rejected",
  APPLICATION_APPROVED: "Application approved",
  APPLICATION_REJECTED: "Application rejected",
  DEMOGRAPHICS_VERIFIED: "Demographics verified",
  DEMOGRAPHICS_REJECTED: "Demographics rejected",
  BIO_VERIFIED: "Bio verified",
  PAYOUT_SENT: "Payout sent",
  REFERRAL_EARNED: "Referral earned",
  EARNINGS_CREDITED: "Earnings credited",
  WITHDRAWAL_PROCESSED: "Withdrawal processed",
  PERFORMANCE_VIRAL: "Clip going viral",
  PERFORMANCE_UNDERPERFORM: "Clip underperforming",
  EARNINGS_MILESTONE: "Earnings milestone",
  SIGNAL_FLAGGED: "Submission flagged (admin)",
  TOKEN_BROKEN: "Social connection broken",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "In-app",
  EMAIL: "Email",
  DISCORD: "Discord",
};

export function NotificationRulesEditor({
  initialRules,
}: {
  initialRules: RuleRow[];
}) {
  const [rules, setRules] = useState<RuleRow[]>(initialRules);
  const [isPending, startTransition] = useTransition();
  const [savingType, setSavingType] = useState<NotificationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRule = (type: NotificationType, patch: Partial<RuleRow>) => {
    setRules((prev) =>
      prev.map((r) => (r.type === type ? { ...r, ...patch, isDefault: false } : r)),
    );
  };

  const persist = (type: NotificationType, next: RuleRow) => {
    setSavingType(type);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/notification-rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: next.type,
            channels: next.channels,
            enabled: next.enabled,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSavingType(null);
      }
    });
  };

  const toggleChannel = (type: NotificationType, channel: NotificationChannel) => {
    const row = rules.find((r) => r.type === type);
    if (!row) return;
    const has = row.channels.includes(channel);
    const channels = has
      ? row.channels.filter((c) => c !== channel)
      : [...row.channels, channel];
    const next: RuleRow = { ...row, channels, isDefault: false };
    updateRule(type, { channels });
    persist(type, next);
  };

  const toggleEnabled = (type: NotificationType) => {
    const row = rules.find((r) => r.type === type);
    if (!row) return;
    const next: RuleRow = { ...row, enabled: !row.enabled, isDefault: false };
    updateRule(type, { enabled: !row.enabled });
    persist(type, next);
  };

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {error ? (
        <div
          className="p-3 text-sm border-b"
          style={{ background: "#3a1212", color: "#ffb4b4", borderColor: "var(--border)" }}
        >
          {error}
        </div>
      ) : null}

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="text-left p-3" style={{ color: "var(--text-secondary)" }}>
              Event
            </th>
            {ALL_CHANNELS.map((c) => (
              <th
                key={c}
                className="p-3 text-center w-24"
                style={{ color: "var(--text-secondary)" }}
              >
                {CHANNEL_LABELS[c]}
              </th>
            ))}
            <th className="p-3 text-center w-24" style={{ color: "var(--text-secondary)" }}>
              Enabled
            </th>
          </tr>
        </thead>
        <tbody>
          {rules.map((row) => (
            <tr key={row.type} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="p-3" style={{ color: "var(--text-primary)" }}>
                <div className="flex items-center gap-2">
                  <span>{TYPE_LABELS[row.type] ?? row.type}</span>
                  {savingType === row.type && isPending ? (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      saving…
                    </span>
                  ) : null}
                </div>
              </td>
              {ALL_CHANNELS.map((c) => (
                <td key={c} className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={row.channels.includes(c)}
                    disabled={!row.enabled || isPending}
                    onChange={() => toggleChannel(row.type, c)}
                    aria-label={`${row.type} ${c}`}
                  />
                </td>
              ))}
              <td className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  disabled={isPending}
                  onChange={() => toggleEnabled(row.type)}
                  aria-label={`${row.type} enabled`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
