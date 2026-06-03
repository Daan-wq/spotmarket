"use client";

import { useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  resolveViewGrowthBucketSize,
  type ViewGrowthBucketSize,
  type ViewGrowthSnapshotInput,
  type ViewGrowthZoom,
} from "@/lib/stats/view-growth-buckets";
import {
  computeSignalViewGrowthTimeline,
  type SignalViewGrowthBucket,
  type SignalViewGrowthTimeline,
} from "@/lib/signals/signal-view-growth-tooltip";

type SignalViewGrowthSnapshot = {
  capturedAt: string;
  viewCount: number;
  engagementCount: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  saveCount?: number | null;
  watchTimeSec?: number | null;
  reachCount?: number | null;
  totalInteractions?: number | null;
  followsFromMedia?: number | null;
  profileVisits?: number | null;
  reactionsByType?: unknown;
  profileActivity?: unknown;
  metricAvailability?: unknown;
  raw?: unknown;
  source: string | null;
};

const ZOOM_ITEMS: Array<{ key: ViewGrowthZoom; label: string }> = [
  { key: "auto", label: "Auto" },
  { key: "15m", label: "15m" },
  { key: "1h", label: "1u" },
  { key: "6h", label: "6u" },
  { key: "1d", label: "Dag" },
];

const BUCKET_LABELS: Record<ViewGrowthBucketSize, string> = {
  "15m": "15 minuten",
  "1h": "1 uur",
  "6h": "6 uur",
  "1d": "1 dag",
};

type ActiveTooltip = {
  key: string;
  x: number;
  y: number;
  range: string;
  bucket: SignalViewGrowthBucket;
};

export function SignalViewGrowthChart({
  snapshots,
  signalReason,
}: {
  snapshots: SignalViewGrowthSnapshot[];
  signalReason?: string;
}) {
  const [zoom, setZoom] = useState<ViewGrowthZoom>("auto");
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const helperSnapshots = useMemo<ViewGrowthSnapshotInput[]>(
    () =>
      snapshots.map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        viewCount: snapshot.viewCount,
        engagementCount: snapshot.engagementCount,
        source: snapshot.source,
      })),
    [snapshots],
  );
  const bucketSize = useMemo(
    () => resolveViewGrowthBucketSize(zoom, helperSnapshots),
    [helperSnapshots, zoom],
  );
  const timeline = useMemo(
    () => computeSignalViewGrowthTimeline(snapshots, bucketSize),
    [bucketSize, snapshots],
  );
  const buckets = timeline.buckets;
  const largestBucketViews = Math.max(0, ...buckets.map((bucket) => bucket.views));
  const maxViews = Math.max(1, largestBucketViews);
  const chartMinWidth = Math.max(640, buckets.length * 10);
  const showTooltip = (
    bucket: (typeof buckets)[number],
    target: HTMLElement,
  ) => {
    const frame = chartFrameRef.current;
    if (!frame) return;

    const frameRect = frame.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const rawX = targetRect.left - frameRect.left + targetRect.width / 2;
    const tooltipHalfWidth = Math.min(170, Math.max(96, (frameRect.width - 16) / 2));
    const x = Math.min(
      Math.max(rawX, tooltipHalfWidth),
      Math.max(tooltipHalfWidth, frameRect.width - tooltipHalfWidth),
    );
    const y = targetRect.top - frameRect.top;

    setActiveTooltip({
      key: bucket.key,
      x,
      y,
      range: formatBucketRange(bucket.start, bucket.end),
      bucket,
    });
  };
  const hideTooltip = () => setActiveTooltip(null);

  if (!timeline.initial) {
    return (
      <div>
        <ZoomTabs value={zoom} onChange={setZoom} />
        <div className="mt-3 flex h-56 items-center justify-center rounded-xl bg-neutral-50 text-sm text-neutral-500">
          Er zijn nog geen geldige metingen om deze timeline te tonen.
        </div>
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <ZoomTabs value={zoom} onChange={setZoom} />
          <p className="text-xs text-neutral-500">Tijdvak: {BUCKET_LABELS[bucketSize]}</p>
        </div>
        <TimelineSummary timeline={timeline} />
        <div className="mt-3 flex h-56 items-center justify-center rounded-xl bg-neutral-50 text-sm text-neutral-500">
          Nog geen latere geldige meting om groei per tijdvak te tonen.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ZoomTabs value={zoom} onChange={setZoom} />
        <p className="text-xs text-neutral-500">Tijdvak: {BUCKET_LABELS[bucketSize]}</p>
      </div>
      <TimelineSummary timeline={timeline} />
      <div ref={chartFrameRef} className="relative">
        <div className="overflow-x-auto rounded-xl bg-neutral-50">
          <div
            className="flex h-56 items-end gap-1 px-3 py-3"
            style={{ minWidth: `${chartMinWidth}px` }}
          >
            {buckets.map((bucket) => {
              const roundedViews = Math.round(bucket.views);
              const height = Math.max(4, (bucket.views / maxViews) * 100);
              const label = `${formatBucketRange(bucket.start, bucket.end)}: +${formatNumber(roundedViews)} views, ${formatEngagements(bucket.engagementTotal)} engagement`;
              return (
                <button
                  key={bucket.key}
                  type="button"
                  className="min-w-1 flex-1 rounded-t border-0 bg-neutral-950 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50"
                  style={{
                    height: `${height}%`,
                    opacity: bucket.views === largestBucketViews ? 1 : 0.45,
                  }}
                  aria-label={label}
                  aria-describedby={activeTooltip?.key === bucket.key ? "signal-view-growth-tooltip" : undefined}
                  onMouseEnter={(event: MouseEvent<HTMLButtonElement>) => showTooltip(bucket, event.currentTarget)}
                  onMouseMove={(event: MouseEvent<HTMLButtonElement>) => showTooltip(bucket, event.currentTarget)}
                  onMouseLeave={hideTooltip}
                  onFocus={(event: FocusEvent<HTMLButtonElement>) => showTooltip(bucket, event.currentTarget)}
                  onBlur={hideTooltip}
                />
              );
            })}
          </div>
        </div>
        {activeTooltip ? (
          <div
            id="signal-view-growth-tooltip"
            role="tooltip"
            className="pointer-events-none absolute z-20 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-3 text-xs shadow-xl ring-1 ring-black/5"
            style={{
              left: `${activeTooltip.x}px`,
              top: `${Math.max(8, activeTooltip.y - 8)}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <MetricTooltipContent
              bucket={activeTooltip.bucket}
              range={activeTooltip.range}
              signalReason={signalReason}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex justify-between gap-3 text-xs text-neutral-500">
        <span>{formatDateTime(buckets[0].start)}</span>
        <span>Grootste tijdvak: +{formatNumber(Math.round(largestBucketViews))}</span>
        <span>{formatDateTime(buckets[buckets.length - 1].end)}</span>
      </div>
    </div>
  );
}

function TimelineSummary({ timeline }: { timeline: SignalViewGrowthTimeline }) {
  if (!timeline.initial) return null;

  return (
    <div className="mb-3 grid gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:grid-cols-2">
      <div>
        <p className="font-semibold text-neutral-950">Al aanwezig bij eerste meting</p>
        <p className="mt-1 tabular-nums">
          {formatNumber(timeline.initial.views)} views
          {timeline.initial.engagementTotal == null
            ? ""
            : ` - ${formatNumber(timeline.initial.engagementTotal)} engagement`}
        </p>
        <p className="mt-1 text-neutral-500">{formatDateTime(timeline.initial.capturedAt)}</p>
      </div>
      <div className="sm:text-right">
        <p className="font-semibold text-neutral-950">Controle totaal</p>
        <p className="mt-1 tabular-nums">
          {formatNumber(timeline.initial.views)} + {formatNumber(Math.round(timeline.measuredGrowthViews))} ={" "}
          {timeline.totalViews == null ? "-" : formatNumber(Math.round(timeline.totalViews))} views
        </p>
        {timeline.initial.engagementTotal != null || timeline.measuredGrowthEngagements != null ? (
          <p className="mt-1 tabular-nums text-neutral-500">
            {formatNumber(timeline.initial.engagementTotal ?? 0)} +{" "}
            {formatNumber(Math.round(timeline.measuredGrowthEngagements ?? 0))} ={" "}
            {timeline.totalEngagements == null ? "-" : formatNumber(Math.round(timeline.totalEngagements))} engagement
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MetricTooltipContent({
  bucket,
  range,
  signalReason,
}: {
  bucket: SignalViewGrowthBucket;
  range: string;
  signalReason?: string;
}) {
  const engagementLabel = bucket.engagementTotal == null
    ? "Niet beschikbaar"
    : `+${formatNumber(Math.round(bucket.engagementTotal))}`;
  const engagementQuality = bucket.engagementPerThousandViews == null
    ? null
    : `${bucket.engagementPerThousandViews.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} / 1k nieuwe views`;
  const extraRows = [
    metricRow("Bereik", bucket.deltas.reach),
    metricRow("Volgers", bucket.deltas.follows),
    metricRow("Profielbezoeken", bucket.deltas.profileVisits),
    metricRow("Totaal interacties", bucket.deltas.totalInteractions),
  ].filter((row): row is { label: string; value: number } => row != null);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Tijdvak</p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-neutral-700">{range}</p>
        </div>
        {bucket.source ? (
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-500">
            {sourceLabel(bucket.source)}
          </span>
        ) : null}
      </div>

      <div className="rounded-lg bg-neutral-50 p-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-neutral-500">Viewgroei</p>
            <p className="text-lg font-semibold tabular-nums text-neutral-950">+{formatNumber(Math.round(bucket.views))}</p>
          </div>
          <p className="pb-1 text-right text-[11px] tabular-nums text-neutral-500">
            totaal {bucket.totalViews == null ? "-" : formatNumber(bucket.totalViews)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-neutral-950">Engagement</p>
          <span className="font-semibold tabular-nums text-neutral-800">{engagementLabel}</span>
        </div>
        {engagementQuality ? (
          <p className="mt-1 text-[11px] text-neutral-500">{engagementQuality}</p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <DeltaPill label="Likes" value={bucket.deltas.likes} />
          <DeltaPill label="Comments" value={bucket.deltas.comments} />
          <DeltaPill label="Shares" value={bucket.deltas.shares} />
          <DeltaPill label="Saves" value={bucket.deltas.saves} />
        </div>
      </div>

      <div className="space-y-1.5 border-t border-neutral-100 pt-3">
        <WatchTimeRow bucket={bucket} />
        {extraRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-neutral-600">
            <span>{row.label}</span>
            <span className="font-semibold tabular-nums text-neutral-800">+{formatNumber(row.value)}</span>
          </div>
        ))}
      </div>

      {bucket.unavailable.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3">
          {bucket.unavailable.map((key) => (
            <span key={key} className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-500">
              {availabilityLabel(key)} niet beschikbaar
            </span>
          ))}
        </div>
      ) : null}

      {signalReason ? (
        <div className="border-t border-neutral-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Waarom relevant</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">{signalReason}</p>
        </div>
      ) : null}
    </div>
  );
}

function DeltaPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1">
      <span className="text-[11px] text-neutral-500">{label}</span>
      <span className="font-semibold tabular-nums text-neutral-800">
        {value == null ? "-" : `+${formatNumber(value)}`}
      </span>
    </div>
  );
}

function WatchTimeRow({ bucket }: { bucket: SignalViewGrowthBucket }) {
  if (bucket.watchTime.deltaSec != null) {
    return (
      <div className="flex items-center justify-between gap-3 text-neutral-600">
        <span>Watch time</span>
        <span className="font-semibold tabular-nums text-neutral-800">+{formatDuration(bucket.watchTime.deltaSec)}</span>
      </div>
    );
  }

  if (bucket.watchTime.averageSec != null) {
    return (
      <div className="flex items-center justify-between gap-3 text-neutral-600">
        <span>Gem. watch time</span>
        <span className="font-semibold tabular-nums text-neutral-800">{formatDuration(bucket.watchTime.averageSec)}</span>
      </div>
    );
  }

  if (bucket.watchTime.unknownKind) {
    return (
      <div className="flex items-center justify-between gap-3 text-neutral-500">
        <span>Watch time</span>
        <span className="font-medium">type onbekend</span>
      </div>
    );
  }

  return null;
}

function ZoomTabs({
  value,
  onChange,
}: {
  value: ViewGrowthZoom;
  onChange: (value: ViewGrowthZoom) => void;
}) {
  return (
    <Tabs
      items={ZOOM_ITEMS}
      value={value}
      onChange={(next) => {
        if (isViewGrowthZoom(next)) onChange(next);
      }}
      size="sm"
      className="border-neutral-200"
    />
  );
}

function isViewGrowthZoom(value: string): value is ViewGrowthZoom {
  return value === "auto" || value === "15m" || value === "1h" || value === "6h" || value === "1d";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("nl-NL").format(value);
}

function metricRow(label: string, value: number | null) {
  return value == null ? null : { label, value };
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${formatNumber(rounded)}s`;
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${formatNumber(minutes)}m ${remainingSeconds}s`
      : `${formatNumber(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${formatNumber(hours)}u ${remainingMinutes}m`
    : `${formatNumber(hours)}u`;
}

function formatEngagements(value: number | null) {
  return value == null ? "Niet beschikbaar" : `+${formatNumber(value)}`;
}

function formatBucketRange(start: Date, end: Date) {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

function formatDateTime(value: Date) {
  return value.toLocaleString("nl-NL", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    OAUTH_IG: "Instagram",
    OAUTH_TT: "TikTok",
    OAUTH_YT: "YouTube",
    OAUTH_FB: "Facebook",
  };
  return labels[source] ?? source.replace("OAUTH_", "");
}

function availabilityLabel(key: string) {
  const labels: Record<string, string> = {
    watchTime: "Watch time",
    saves: "Saves",
    reach: "Reach",
    follows: "Follows",
    profileVisits: "Profielbezoeken",
    totalInteractions: "Totaal interacties",
    reactions: "Reacties",
  };
  return labels[key] ?? key;
}
