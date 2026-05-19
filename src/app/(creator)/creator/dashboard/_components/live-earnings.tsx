"use client";

/**
 * Live Earnings ticker — Subsystem C.
 *
 * Polls /api/clipper/live-earnings every 60s and shows estimated (unsettled,
 * computed from the latest view counts × creatorCpv) vs settled earnings.
 *
 * "Estimated" means: views are still being counted; the figure floats up as
 * MetricSnapshots arrive from Subsystem A. "Settled" is locked, paid-or-payable.
 */

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrencyPrecise } from "@/lib/admin/agency-format";

interface LiveEarningsResponse {
  settled: number;
  settledCount: number;
  estimated: number;
  estimatedCount: number;
  latestSnapshotAt: string | null;
  asOf: string;
}

const POLL_INTERVAL_MS = 60_000;

async function fetchLiveEarnings(): Promise<LiveEarningsResponse> {
  const r = await fetch("/api/clipper/live-earnings", { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as LiveEarningsResponse;
}

export function LiveEarnings() {
  const locale = useLocale();
  const t = useTranslations("dashboard.creator.liveEarnings");
  const { data, error, isLoading } = useQuery({
    queryKey: ["live-earnings"],
    queryFn: fetchLiveEarnings,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const loading = isLoading && !data;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PulseDot active={!loading && !error} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h3>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {error
            ? t("offline")
            : data
            ? t("updated", { time: formatRelative(data.asOf, t) })
            : t("loading")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric
          label={t("estimated")}
          value={data?.estimated ?? 0}
          loading={loading}
          locale={locale}
          subtitle={
            data && data.estimatedCount > 0
              ? t("activeClips", { count: data.estimatedCount })
              : t("noActiveClips")
          }
          color="#f59e0b"
          help={t("estimatedHelp")}
        />
        <Metric
          label={t("settled")}
          value={data?.settled ?? 0}
          loading={loading}
          locale={locale}
          subtitle={
            data && data.settledCount > 0
              ? t("settledCount", { count: data.settledCount })
              : t("awaitingSettlement")
          }
          color="#22c55e"
          help={t("settledHelp")}
        />
      </div>
      {error && (
        <p className="text-xs mt-3" style={{ color: "var(--error-text)" }}>
          {t("error")}
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  subtitle,
  color,
  loading,
  locale,
  help,
}: {
  label: string;
  value: number;
  subtitle: string;
  color: string;
  loading: boolean;
  locale: string;
  help: string;
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--bg-primary)" }}
      title={help}
    >
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {loading ? "-" : formatCurrencyPrecise(value, "EUR", locale)}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
        {subtitle}
      </div>
    </div>
  );
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 999,
        background: active ? "#22c55e" : "var(--text-muted)",
        boxShadow: active ? "0 0 0 0 rgba(34,197,94,0.6)" : undefined,
        animation: active ? "live-earnings-pulse 2s infinite" : undefined,
      }}
    />
  );
}

function formatRelative(
  iso: string,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return t("relative.justNow");
  if (s < 60) return t("relative.secondsAgo", { count: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t("relative.minutesAgo", { count: m });
  const h = Math.floor(m / 60);
  return t("relative.hoursAgo", { count: h });
}
