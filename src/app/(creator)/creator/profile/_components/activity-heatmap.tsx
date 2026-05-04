"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export interface ActivityDay {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  days: ActivityDay[];
  /** How many weeks back to show. Default 12. */
  weeks?: number;
}

const DAY_LABELS = ["Mon", "Wed", "Fri"];
const SHADES = [
  "rgba(99, 102, 241, 0.08)",
  "rgba(99, 102, 241, 0.25)",
  "rgba(99, 102, 241, 0.5)",
  "rgba(99, 102, 241, 0.75)",
  "rgba(99, 102, 241, 1)",
];

export function ActivityHeatmap({ days, weeks = 12 }: ActivityHeatmapProps) {
  const stats = useMemo(() => computeStats(days), [days]);
  const grid = useMemo(() => buildGrid(days, weeks), [days, weeks]);
  const max = useMemo(
    () => Math.max(1, ...days.map((d) => d.count)),
    [days],
  );

  if (days.length === 0 || stats.totalClips === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Submit your first clip to start building your activity history."
        primaryCta={{ label: "Browse campaigns", href: "/creator/campaigns" }}
      />
    );
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Activity
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Clips submitted in the last {weeks} weeks.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Less
          {SHADES.map((s, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: s }}
            />
          ))}
          More
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {/* Day-of-week labels */}
        <div className="flex flex-col justify-between text-[10px] py-1" style={{ color: "var(--text-muted)" }}>
          {DAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {/* Grid columns = weeks */}
        <div className="flex gap-1">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <span
                  key={di}
                  title={
                    day
                      ? `${day.count} clip${day.count === 1 ? "" : "s"} on ${day.date}`
                      : undefined
                  }
                  className="block h-3 w-3 rounded-sm"
                  style={{
                    background: day
                      ? SHADES[bucket(day.count, max)]
                      : "var(--muted)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Total clips" value={stats.totalClips.toString()} />
        <Stat label="Active days" value={stats.activeDays.toString()} />
        <Stat label="Current streak" value={`${stats.currentStreak}d`} />
        <Stat label="Longest streak" value={`${stats.longestStreak}d`} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "var(--bg-secondary)" }}
    >
      <dt className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </dd>
    </div>
  );
}

function bucket(count: number, max: number): number {
  if (count <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.8) return 4;
  if (ratio > 0.6) return 3;
  if (ratio > 0.3) return 2;
  return 1;
}

function buildGrid(days: ActivityDay[], weeks: number): Array<Array<ActivityDay | null>> {
  const map = new Map(days.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Start from the Monday `weeks` weeks ago
  const start = new Date(today);
  // Offset to Monday: getDay() returns 0 (Sun) - 6 (Sat). Map to (1=Mon ... 0=Sun -> 7)
  const dow = (today.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow - (weeks - 1) * 7);

  const grid: Array<Array<ActivityDay | null>> = [];
  for (let w = 0; w < weeks; w++) {
    const week: Array<ActivityDay | null> = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(cell.getDate() + w * 7 + d);
      if (cell > today) {
        week.push(null);
        continue;
      }
      const key = cell.toISOString().slice(0, 10);
      week.push(map.get(key) ?? { date: key, count: 0 });
    }
    grid.push(week);
  }
  return grid;
}

function computeStats(days: ActivityDay[]) {
  const totalClips = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  // Streaks — sort ascending by date
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longestStreak = 0;
  let runStreak = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    if (d.count === 0) {
      runStreak = 0;
      prev = null;
      continue;
    }
    const cur = new Date(d.date);
    if (prev) {
      const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      runStreak = diff === 1 ? runStreak + 1 : 1;
    } else {
      runStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runStreak);
    prev = cur;
  }

  // Current streak: walk back from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map(days.map((d) => [d.date, d.count]));
  let currentStreak = 0;
  for (let offset = 0; offset < 366; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    if ((map.get(key) ?? 0) > 0) {
      currentStreak += 1;
    } else if (offset === 0) {
      // No clip today doesn't break the streak — start counting from yesterday
      continue;
    } else {
      break;
    }
  }

  return { totalClips, activeDays, longestStreak, currentStreak };
}
