"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface AccountGrowthPoint {
  date: string;
  followers: number | null;
  following: number | null;
  videoCount: number | null;
  totalLikes: number | null;
}

const SERIES = [
  { key: "followers", label: "Followers", color: "#6366F1" },
  { key: "following", label: "Following", color: "#14b8a6" },
  { key: "videoCount", label: "Videos", color: "#F59E0B" },
  { key: "totalLikes", label: "Total likes", color: "#EC4899" },
] as const;

export function AccountGrowthChart({ data, height = 240 }: { data: AccountGrowthPoint[]; height?: number }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    followers: true,
    following: false,
    videoCount: false,
    totalLikes: false,
  });

  if (data.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
          Account growth
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No daily account snapshots yet for this range.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
          Account growth
        </p>
        <div className="flex gap-2 flex-wrap">
          {SERIES.map((s) => {
            const active = !!enabled[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setEnabled((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                className="text-xs px-2 py-0.5 rounded-md transition-colors"
                style={{
                  background: active ? s.color : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${active ? s.color : "var(--border)"}`,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {SERIES.filter((s) => enabled[s.key]).map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
