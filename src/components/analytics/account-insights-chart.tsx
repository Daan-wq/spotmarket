"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AccountInsightDataPoint {
  date: string;
  views: number;
  follows: number;
}

export function AccountInsightsChart({ data }: { data: AccountInsightDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-40 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        No account insight data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
            name === "views" ? "Views" : "Net Follows",
          ]}
        />
        <Legend
          formatter={(value) => (value === "views" ? "Views" : "Net Follows")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="views"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="follows"
          stroke="var(--success)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
