"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SiteAnalyticsTimePoint } from "@/lib/site-analytics/model";

export function SiteAnalyticsTrendChart({ data }: { data: SiteAnalyticsTimePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-sm text-neutral-500">No timeline data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="siteAnalyticsPageviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18181b" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#18181b" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#737373" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis stroke="#737373" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="pageviews"
            name="Pageviews"
            stroke="#18181b"
            fill="url(#siteAnalyticsPageviews)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="signups"
            name="Signups"
            stroke="#0f766e"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
