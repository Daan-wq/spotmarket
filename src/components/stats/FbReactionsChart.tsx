"use client";

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
import type { FbReactionPoint } from "@/lib/stats/trends";

const REACTIONS: { key: keyof Omit<FbReactionPoint, "date">; color: string; label: string }[] = [
  { key: "like", color: "#1877F2", label: "Like" },
  { key: "love", color: "#F33E58", label: "Love" },
  { key: "haha", color: "#F7B928", label: "Haha" },
  { key: "wow", color: "#F7B928", label: "Wow" },
  { key: "sad", color: "#F7B928", label: "Sad" },
  { key: "angry", color: "#E9710F", label: "Angry" },
  { key: "care", color: "#FFA500", label: "Care" },
  { key: "thankful", color: "#9B59B6", label: "Thankful" },
  { key: "pride", color: "#8E44AD", label: "Pride" },
];

export function FbReactionsChart({ data, height = 240 }: { data: FbReactionPoint[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
          Reactions over time
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No FB reaction data in this range.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
        Reactions over time
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {REACTIONS.map((r) => (
            <Area
              key={r.key}
              type="monotone"
              dataKey={r.key}
              name={r.label}
              stackId="1"
              stroke={r.color}
              fill={r.color}
              fillOpacity={0.55}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
