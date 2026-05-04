"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RetentionCurveChartProps {
  data: { tSec: number; retentionPct: number }[];
  height?: number;
  emptyMessage?: string;
}

export function RetentionCurveChart({
  data,
  height = 240,
  emptyMessage = "No retention curves recorded yet.",
}: RetentionCurveChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
        Average retention curve
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="tSec"
            tickFormatter={(t) => `${Math.round(t)}s`}
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 12 }}
            formatter={(value: unknown) => [`${Number(value).toFixed(1)}%`, "Retention"]}
            labelFormatter={(label: unknown) => `${Math.round(Number(label))}s`}
          />
          <Line type="monotone" dataKey="retentionPct" stroke="#1877F2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
