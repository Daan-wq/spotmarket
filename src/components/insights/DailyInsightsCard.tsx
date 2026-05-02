"use client";

import { ReactNode, useState } from "react";
import DailyInsightsChart, { MetricSeries } from "./DailyInsightsChart";

type View = "table" | "chart";

interface Props<T extends { date: string }> {
  data: T[];
  metrics: MetricSeries[];
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

export default function DailyInsightsCard<T extends { date: string }>({
  data,
  metrics,
  isEmpty,
  emptyMessage,
  children,
}: Props<T>) {
  const [view, setView] = useState<View>("table");

  return (
    <div
      className="rounded-lg p-6 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Daily Insights
        </h3>
        {!isEmpty && (
          <ViewToggle view={view} onChange={setView} />
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {emptyMessage}
        </p>
      ) : view === "table" ? (
        children
      ) : (
        <DailyInsightsChart data={data} metrics={metrics} />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 p-0.5 rounded-lg"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
      }}
    >
      <ToggleButton
        active={view === "table"}
        onClick={() => onChange("table")}
        label="Table"
      >
        <TableIcon />
      </ToggleButton>
      <ToggleButton
        active={view === "chart"}
        onClick={() => onChange("chart")}
        label="Chart"
      >
        <ChartIcon />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
      style={{
        background: active ? "var(--bg-card)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {children}
      {label}
    </button>
  );
}

function TableIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}
