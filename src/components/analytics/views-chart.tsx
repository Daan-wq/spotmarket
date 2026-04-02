"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ViewsDataPoint {
  date: string;
  views: number;
  reach: number;
}

export function ViewsChart({ data }: { data: ViewsDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-40 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        No view data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
          }}
          formatter={(value, name) => [
            typeof value === "number" ? value.toLocaleString() : String(value),
            name === "views" ? "Views" : "Reach",
          ]}
        />
        <Area
          type="monotone"
          dataKey="views"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#viewsGradient)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="reach"
          stroke="var(--success)"
          strokeWidth={2}
          fill="url(#reachGradient)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
