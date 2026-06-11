"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/admin/agency-format";
import type {
  BrandCampaignMilestone,
  BrandPausePeriod,
} from "@/lib/brand-report-portal";

interface ChartPoint {
  date: string;
  views: number | null;
  actualViews: number | null;
  cumulativeViews: number;
}

interface BrandViewsChartProps {
  data: Array<{ date: string; views: number; cumulativeViews: number }>;
  milestones: BrandCampaignMilestone[];
  pausePeriods: BrandPausePeriod[];
  currentDate: string;
}

export function BrandViewsChart({ data, milestones, pausePeriods, currentDate }: BrandViewsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 text-center">
        <p className="max-w-sm text-sm leading-6 text-neutral-500">
          De viewgroei verschijnt zodra de eerste goedgekeurde video meetdata heeft.
        </p>
      </div>
    );
  }

  const chartData = buildChartSeries(data, milestones, pausePeriods, currentDate);
  const pauseAreas = buildChartPauseAreas(pausePeriods, chartData);

  return (
    <div>
      <div className="h-72 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 320, height: 288 }}
        >
          <AreaChart data={chartData} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="brandViewsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#171717" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#171717" stopOpacity={0} />
              </linearGradient>
              <pattern
                id="brandPauseHatch"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="8" height="8" fill="#f5f5f5" fillOpacity={0.78} />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#d4d4d4" strokeWidth="2" />
              </pattern>
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
              content={(
                <BrandChartTooltip
                  milestones={milestones}
                  pausePeriods={pausePeriods}
                />
              )}
            />
            <Area
              connectNulls={false}
              dataKey="views"
              fill="url(#brandViewsFill)"
              fillOpacity={1}
              stroke="#171717"
              strokeWidth={2.5}
              type="monotone"
            />
            {pauseAreas.map((period) => (
              <ReferenceArea
                key={`${period.startDate}-${period.endDate}`}
                x1={period.startDate}
                x2={period.endDate}
                fill="url(#brandPauseHatch)"
                fillOpacity={1}
                stroke="#a3a3a3"
                strokeDasharray="3 3"
                strokeOpacity={0.45}
                label={{
                  value: "Pauze",
                  position: "insideTop",
                  fill: "#525252",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
            {milestones.map((milestone, index) => (
              <ReferenceLine
                key={`${milestone.type}-${milestone.date}-${index}`}
                x={milestone.date}
                stroke={milestone.type === "GOAL_REACHED" ? "#047857" : "#a3a3a3"}
                strokeDasharray={milestone.type === "GOAL_REACHED" ? "0" : "4 4"}
                strokeWidth={milestone.type === "GOAL_REACHED" ? 2 : 1}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {milestones.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {milestones.map((milestone, index) => (
            <span
              key={`${milestone.type}-${milestone.date}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${milestone.type === "GOAL_REACHED" ? "bg-emerald-600" : "bg-neutral-400"}`} />
              {milestone.label} · {formatChartDate(milestone.date)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BrandChartTooltip({
  active,
  payload,
  label,
  milestones,
  pausePeriods,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
  label?: string;
  milestones: BrandCampaignMilestone[];
  pausePeriods: BrandPausePeriod[];
}) {
  if (!active || !label) return null;
  const point = payload?.[0]?.payload;
  const content = buildBrandChartTooltipContent({
    date: String(label),
    views: point?.actualViews ?? point?.views ?? null,
    cumulativeViews: point?.cumulativeViews ?? 0,
    milestones,
    pausePeriods,
  });

  return (
    <div className="min-w-48 rounded-xl bg-neutral-950 p-3 text-xs text-white shadow-xl">
      <p className="font-semibold">{content.dateLabel}</p>
      <div className="mt-2 space-y-1 text-neutral-300">
        <p>Views die dag: <span className="font-semibold text-white">{content.dailyViewsLabel}</span></p>
        <p>Totaal tot die dag: <span className="font-semibold text-white">{content.cumulativeViewsLabel}</span></p>
      </div>
      {content.pauseLabel ? (
        <p className="mt-2 rounded-md bg-white/10 px-2 py-1.5 text-neutral-200">
          {content.pauseLabel}
        </p>
      ) : null}
      {content.milestoneLabels.length > 0 ? (
        <div className="mt-2 border-t border-white/15 pt-2 text-neutral-200">
          {content.milestoneLabels.map((milestone) => <p key={milestone}>{milestone}</p>)}
        </div>
      ) : null}
    </div>
  );
}

export function buildBrandChartTooltipContent({
  date,
  views,
  cumulativeViews,
  milestones,
  pausePeriods = [],
}: {
  date: string;
  views: number | null;
  cumulativeViews: number;
  milestones: BrandCampaignMilestone[];
  pausePeriods?: BrandPausePeriod[];
}) {
  return {
    dateLabel: formatLongDate(date),
    dailyViewsLabel: views == null ? "–" : formatNumber(views, "nl"),
    cumulativeViewsLabel: formatNumber(cumulativeViews, "nl"),
    milestoneLabels: milestones
      .filter((milestone) => milestone.date === date)
      .map((milestone) => milestone.label),
    pauseLabel: pausePeriods.some((period) => isDateInPausePeriod(date, period))
      ? "Campagne gepauzeerd"
      : null,
  };
}

export function buildChartSeries(
  data: Array<{ date: string; views: number; cumulativeViews: number }>,
  milestones: BrandCampaignMilestone[],
  pausePeriods: BrandPausePeriod[],
  currentDate?: string,
): ChartPoint[] {
  const dates = new Set([
    ...data.map((row) => row.date),
    ...milestones.map((row) => row.date),
    ...pausePeriods.flatMap((period) => (
      period.endDate ? [period.startDate, period.endDate] : [period.startDate]
    )),
  ]);
  const rowsByDate = new Map(data.map((row) => [row.date, row]));
  const sortedDates = [...dates].sort();
  let cumulativeViews = 0;
  let latestCompletedDayViews: number | null = null;

  return sortedDates.map((date) => {
    const row = rowsByDate.get(date);
    if (row) cumulativeViews = row.cumulativeViews;
    const actualViews = row?.views ?? null;
    const views = date === currentDate && latestCompletedDayViews != null
      ? latestCompletedDayViews
      : actualViews;
    if (actualViews != null && (!currentDate || date < currentDate)) {
      latestCompletedDayViews = actualViews;
    }
    return {
      date,
      views,
      actualViews,
      cumulativeViews,
    };
  });
}

export function buildChartPauseAreas(
  pausePeriods: BrandPausePeriod[],
  data: Array<{
    date: string;
    views?: number | null;
    cumulativeViews?: number;
  }>,
) {
  const firstDate = data.at(0)?.date;
  const lastDate = data.at(-1)?.date;
  if (!firstDate || !lastDate) return [];

  return pausePeriods.flatMap((period) => {
    const startDate = period.startDate < firstDate ? firstDate : period.startDate;
    const periodEnd = period.endDate ?? lastDate;
    const endDate = periodEnd > lastDate ? lastDate : periodEnd;
    return endDate >= startDate ? [{ startDate, endDate }] : [];
  });
}

function isDateInPausePeriod(date: string, period: BrandPausePeriod) {
  return date >= period.startDate && (period.endDate == null || date < period.endDate);
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
