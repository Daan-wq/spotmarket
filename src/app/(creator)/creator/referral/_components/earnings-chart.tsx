"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyEarning {
  month: string;
  earnings: number;
}

export function ReferralEarningsChart({ data }: { data: MonthlyEarning[] }) {
  if (data.length === 0 || data.every((d) => d.earnings === 0)) {
    return (
      <div
        className="h-48 flex items-center justify-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No referral earnings yet.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month + "-01").toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="referralGrad" x1="0" y1="0" x2="0" y2="1">
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
          formatter={(value) => {
            const v = Number(value ?? 0);
            return [`$${v.toFixed(2)}`, "Earnings"];
          }}
        />
        <Area
          type="monotone"
          dataKey="earnings"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#referralGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
