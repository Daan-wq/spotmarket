"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { YtBreakdownPoint } from "@/lib/stats/trends";

interface DimensionalBreakdownProps {
  title: string;
  data: YtBreakdownPoint[];
  height?: number;
}

const PALETTE = [
  "#6366F1",
  "#14b8a6",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#10B981",
  "#EF4444",
  "#3B82F6",
  "#F97316",
];

export function DimensionalBreakdown({ title, data, height = 220 }: DimensionalBreakdownProps) {
  const { rows, keys } = useMemo(() => {
    const allKeys = new Set<string>();
    for (const p of data) for (const k of Object.keys(p.buckets)) allKeys.add(k);
    const keysArr = Array.from(allKeys);

    const rows = data.map((p) => {
      const row: Record<string, string | number> = { date: p.date };
      for (const k of keysArr) row[k] = p.buckets[k] ?? 0;
      return row;
    });
    return { rows, keys: keysArr };
  }, [data]);

  if (rows.length === 0 || keys.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>{title}</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No data in this range.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
