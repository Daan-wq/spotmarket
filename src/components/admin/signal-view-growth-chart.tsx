"use client";

import { useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  computeBucketedViewGrowth,
  resolveViewGrowthBucketSize,
  type ViewGrowthBucketSize,
  type ViewGrowthSnapshotInput,
  type ViewGrowthZoom,
} from "@/lib/stats/view-growth-buckets";

type SignalViewGrowthSnapshot = {
  capturedAt: string;
  viewCount: number;
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
  views: number;
};

export function SignalViewGrowthChart({
  snapshots,
}: {
  snapshots: SignalViewGrowthSnapshot[];
}) {
  const [zoom, setZoom] = useState<ViewGrowthZoom>("auto");
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const helperSnapshots = useMemo<ViewGrowthSnapshotInput[]>(
    () =>
      snapshots.map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        viewCount: snapshot.viewCount,
        source: snapshot.source,
      })),
    [snapshots],
  );
  const bucketSize = useMemo(
    () => resolveViewGrowthBucketSize(zoom, helperSnapshots),
    [helperSnapshots, zoom],
  );
  const buckets = useMemo(
    () => computeBucketedViewGrowth(helperSnapshots, bucketSize),
    [bucketSize, helperSnapshots],
  );
  const maxViews = Math.max(1, ...buckets.map((bucket) => bucket.views));
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
    const x = Math.min(Math.max(rawX, 96), Math.max(96, frameRect.width - 96));
    const y = targetRect.top - frameRect.top;

    setActiveTooltip({
      key: bucket.key,
      x,
      y,
      range: formatBucketRange(bucket.start, bucket.end),
      views: Math.round(bucket.views),
    });
  };
  const hideTooltip = () => setActiveTooltip(null);

  if (buckets.length === 0) {
    return (
      <div>
        <ZoomTabs value={zoom} onChange={setZoom} />
        <div className="mt-3 flex h-56 items-center justify-center rounded-xl bg-neutral-50 text-sm text-neutral-500">
          Er zijn minstens twee geldige metingen nodig om groei te tonen.
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
      <div ref={chartFrameRef} className="relative">
        <div className="overflow-x-auto rounded-xl bg-neutral-50">
          <div
            className="flex h-56 items-end gap-1 px-3 py-3"
            style={{ minWidth: `${chartMinWidth}px` }}
          >
            {buckets.map((bucket) => {
              const roundedViews = Math.round(bucket.views);
              const height = Math.max(4, (bucket.views / maxViews) * 100);
              const label = `${formatBucketRange(bucket.start, bucket.end)}: +${formatNumber(roundedViews)} views`;
              return (
                <button
                  key={bucket.key}
                  type="button"
                  className="min-w-1 flex-1 rounded-t border-0 bg-neutral-950 p-0 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50"
                  style={{
                    height: `${height}%`,
                    opacity: bucket.views === maxViews ? 1 : 0.45,
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
            className="pointer-events-none absolute z-20 max-w-[220px] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/5"
            style={{
              left: `${activeTooltip.x}px`,
              top: `${Math.max(8, activeTooltip.y - 8)}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-semibold tabular-nums text-neutral-950">+{formatNumber(activeTooltip.views)} views</p>
            <p className="mt-1 whitespace-nowrap text-neutral-500">{activeTooltip.range}</p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex justify-between gap-3 text-xs text-neutral-500">
        <span>{formatDateTime(buckets[0].start)}</span>
        <span>Grootste tijdvak: +{formatNumber(Math.round(maxViews))}</span>
        <span>{formatDateTime(buckets[buckets.length - 1].end)}</span>
      </div>
    </div>
  );
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
