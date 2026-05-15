"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelineContentType, TimelineEvent } from "@/lib/stats/timeline";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/stats/types";
import type { DailyPoint } from "./DailyViewsChart";

interface TimelineChartProps {
  series: DailyPoint[];
  events: TimelineEvent[];
  height?: number;
}

const CONTENT_TYPE_LABEL: Record<TimelineContentType, string> = {
  reel: "Reel",
  post: "Post",
  story: "Story",
  video: "Video",
  short: "Short",
};

interface HoverState {
  event: TimelineEvent;
  x: number;
  y: number;
}

interface MarkerProps {
  cx?: number;
  cy?: number;
  fill?: string;
  contentType: TimelineContentType;
}

/**
 * Renders an SVG marker for one timeline event. Shape per contentType, color set by ReferenceDot.
 * Returned as a render-prop element to recharts' `shape` prop.
 */
function TimelineMarker({ cx = 0, cy = 0, fill = "#6366F1", contentType }: MarkerProps) {
  const r = 6;
  const stroke = "#fff";
  const strokeWidth = 1.5;
  if (contentType === "story") {
    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (contentType === "post") {
    return (
      <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    );
  }
  if (contentType === "video") {
    // Diamond
    const d = `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
    return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (contentType === "short") {
    // Five-point star (small)
    const points = starPoints(cx, cy, r, r * 0.45, 5);
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  // Default (reel) — triangle
  const d = `M ${cx} ${cy - r} L ${cx + r} ${cy + r * 0.85} L ${cx - r} ${cy + r * 0.85} Z`;
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number) {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    out.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return out.join(" ");
}

export function TimelineChart({ series, events, height = 280 }: TimelineChartProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  // Group events by date so multiple posts on the same day stack vertically (small offset).
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const key = e.postedAt.toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  // Y-domain: max of (series.views, dayDelta+stack offset) so markers stay inside the plot.
  const yMax = useMemo(() => {
    const seriesMax = series.reduce((m, p) => Math.max(m, p.views), 0);
    const eventMax = events.reduce((m, e) => Math.max(m, e.dayDelta), 0);
    return Math.max(seriesMax, eventMax) * 1.15 || 1;
  }, [series, events]);

  if (series.length === 0 && events.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs uppercase tracking-wide mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
          Timeline
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No view data or posts in this range yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
          Daily views & post timeline
        </p>
        <Legend />
      </div>

      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={[0, yMax]} />
            <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#6366F1"
              fill="url(#timelineFill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            {Array.from(eventsByDate.entries()).flatMap(([date, dayEvents]) =>
              dayEvents.map((e, i) => {
                // Stack multiple events on same day with a slight Y offset so they don't overlap.
                const stackOffset = (i / Math.max(dayEvents.length, 1)) * yMax * 0.06;
                const yPos = Math.min(yMax * 0.95, e.dayDelta + stackOffset);
                return (
                  <ReferenceDot
                    key={e.id}
                    x={date}
                    y={yPos}
                    fill={PLATFORM_COLOR[e.platform]}
                    shape={(props: { cx?: number; cy?: number; fill?: string }) => (
                      <g
                        onMouseEnter={(ev: React.MouseEvent<SVGGElement>) => {
                          setHover({ event: e, x: ev.clientX, y: ev.clientY });
                        }}
                        onMouseLeave={() => setHover(null)}
                        style={{ cursor: e.permalink ? "pointer" : "default" }}
                      >
                        <TimelineMarker
                          cx={props.cx}
                          cy={props.cy}
                          fill={props.fill ?? PLATFORM_COLOR[e.platform]}
                          contentType={e.contentType}
                        />
                      </g>
                    )}
                  />
                );
              }),
            )}
          </AreaChart>
        </ResponsiveContainer>

        {hover ? <HoverCard hover={hover} /> : null}
      </div>
    </div>
  );
}

function HoverCard({ hover }: { hover: HoverState }) {
  const e = hover.event;
  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg p-2.5 shadow-lg"
      style={{
        left: hover.x + 10,
        top: hover.y + 10,
        background: "var(--bg-card)",
        border: `1px solid ${PLATFORM_COLOR[e.platform]}`,
        maxWidth: 240,
        fontSize: 12,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
          style={{
            background: `${PLATFORM_COLOR[e.platform]}1a`,
            color: PLATFORM_COLOR[e.platform],
          }}
        >
          {PLATFORM_LABEL[e.platform]}
        </span>
        <span style={{ color: "var(--text-secondary)" }}>{CONTENT_TYPE_LABEL[e.contentType]}</span>
      </div>
      <p className="font-semibold leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
        {truncate(e.title, 60)}
      </p>
      <p style={{ color: "var(--text-muted)" }}>
        {new Date(e.postedAt).toLocaleString()}
      </p>
      {e.dayDelta > 0 ? (
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          +{e.dayDelta.toLocaleString()} views that day
        </p>
      ) : null}
      {e.permalink ? (
        <p className="mt-1 text-[11px]" style={{ color: PLATFORM_COLOR[e.platform] }}>
          Click marker to open post
        </p>
      ) : null}
    </div>
  );
}

function Legend() {
  const items: Array<{ label: string; shape: string }> = [
    { label: "Story", shape: "●" },
    { label: "Reel", shape: "▲" },
    { label: "Post", shape: "■" },
    { label: "Video", shape: "◆" },
    { label: "Short", shape: "★" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px]" style={{ color: "var(--text-muted)" }}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          <span style={{ fontSize: 11 }}>{item.shape}</span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
