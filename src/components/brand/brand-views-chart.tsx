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
import { formatNumber } from "@/lib/admin/agency-format";

interface BrandViewsChartProps {
  data: Array<{ date: string; views: number }>;
}

export function BrandViewsChart({ data }: BrandViewsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 text-center">
        <p className="max-w-sm text-sm leading-6 text-neutral-500">
          De viewgroei verschijnt zodra de eerste goedgekeurde video meetdata heeft.
        </p>
      </div>
    );
  }

  return (
    <div className="h-72 min-w-0">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 320, height: 288 }}
      >
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="brandViewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#171717" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#171717" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 5" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={28}
            tick={{ fill: "#737373", fontSize: 11 }}
            tickFormatter={formatChartDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#737373", fontSize: 11 }}
            tickFormatter={formatCompactNumber}
            tickLine={false}
            width={54}
          />
          <Tooltip
            cursor={{ stroke: "#a3a3a3", strokeDasharray: "4 4" }}
            contentStyle={{
              background: "#171717",
              border: 0,
              borderRadius: 12,
              color: "#ffffff",
              fontSize: 12,
            }}
            formatter={(value) => [formatNumber(Number(value ?? 0), "nl"), "Views"]}
            labelFormatter={(label) => formatLongDate(String(label))}
          />
          <Area
            dataKey="views"
            fill="url(#brandViewsFill)"
            fillOpacity={1}
            stroke="#171717"
            strokeWidth={2.5}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatChartDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
