"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

interface LiftSparklineProps {
  data: Array<{ date: string; views: number }>;
  color?: string;
}

/**
 * Tiny inline 7-day-after view-lift sparkline. ~80×20px, no axes/grid/tooltip.
 * Falls back to "—" when there are <2 datapoints (no shape to draw).
 */
export function LiftSparkline({ data, color = "#6366F1" }: LiftSparklineProps) {
  if (data.length < 2) {
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        —
      </span>
    );
  }
  return (
    <div style={{ width: 80, height: 20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={[0, "dataMax"]} />
          <Line
            type="monotone"
            dataKey="views"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
