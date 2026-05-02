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

import { useEffect, useState } from "react";

interface LiveEarningsResponse {
  settled: number;
  settledCount: number;
  estimated: number;
  estimatedCount: number;
  latestSnapshotAt: string | null;
  asOf: string;
}

const POLL_INTERVAL_MS = 60_000;

export function LiveEarnings() {
  const [data, setData] = useState<LiveEarningsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        const r = await fetch("/api/clipper/live-earnings", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as LiveEarningsResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOnce();
    const id = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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
            Live Earnings
          </h3>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {error
            ? "Offline"
            : data
            ? `Updated ${formatRelative(data.asOf)}`
            : "Loading…"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Estimated"
          value={data?.estimated ?? 0}
          loading={loading && !data}
          subtitle={
            data && data.estimatedCount > 0
              ? `${data.estimatedCount} active clip${data.estimatedCount === 1 ? "" : "s"}`
              : "No active clips"
          }
          color="#f59e0b"
          help="Views × CPV across approved, unsettled clips. Updates as views come in."
        />
        <Metric
          label="Settled"
          value={data?.settled ?? 0}
          loading={loading && !data}
          subtitle={
            data && data.settledCount > 0
              ? `${data.settledCount} settled`
              : "Awaiting first settlement"
          }
          color="#22c55e"
          help="Locked earnings from settled submissions."
        />
      </div>
      {error && (
        <p className="text-xs mt-3" style={{ color: "var(--error-text)" }}>
          Could not refresh live earnings — retrying in 60s.
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
  help,
}: {
  label: string;
  value: number;
  subtitle: string;
  color: string;
  loading: boolean;
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
        {loading ? "—" : `$${value.toFixed(2)}`}
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
