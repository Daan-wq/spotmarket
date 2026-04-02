"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EarningsDataPoint {
  label: string;
  earned: number;
  views: number;
}

export function EarningsChart({ data }: { data: EarningsDataPoint[] }) {
  if (data.length === 0 || data.every((d) => d.earned === 0)) {
    return (
      <div
        className="h-48 flex items-center justify-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No earnings data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickFormatter={(v) => `$${v}`}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-primary)",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
          formatter={(value, name) => {
            const v = Number(value ?? 0);
            return name === "earned"
              ? [`$${v.toFixed(2)}`, "Earned"]
              : [v.toLocaleString(), "Views"];
          }}
        />
        <Area
          type="monotone"
          dataKey="earned"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#earnedGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
