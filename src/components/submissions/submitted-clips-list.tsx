"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import ClipThumbnail from "@/components/shared/ClipThumbnail";
import { relativeTime } from "@/lib/relative-time";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/animate-ui/components/radix/dropdown-menu";

export type SubmittedClipMediaType = "video" | "image" | "carousel";

export interface SubmittedClipData {
  id: string;
  postUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: SubmittedClipMediaType;
  status: string;
  earned: number;
  views: number;
  createdAt: string;
  campaignName: string;
  platform: string | null;
}

interface SubmittedClipsListProps {
  videos: SubmittedClipData[];
  statusCounts: Record<string, number>;
  mode: "creator" | "campaign";
  detailBasePath: string;
  campaignFilterLabel?: string;
  showCampaignColumn?: boolean;
  emptyState?: {
    title: string;
    description: string;
    primaryCta?: { label: string; href?: string; onClick?: () => void };
    secondaryCta?: { label: string; href?: string; onClick?: () => void };
  };
}

type QueueKey = "ALL" | "PENDING" | "ISSUES" | "APPROVED";
type SortKey = "newest" | "most-views" | "highest-earned";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "most-views", label: "Most views" },
  { key: "highest-earned", label: "Highest earned" },
];

export function SubmittedClipsList({
  videos,
  statusCounts,
  mode,
  detailBasePath,
  campaignFilterLabel,
  showCampaignColumn = mode === "creator",
  emptyState,
}: SubmittedClipsListProps) {
  const [queue, setQueue] = useState<QueueKey>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const issueCount = (statusCounts.FLAGGED ?? 0) + (statusCounts.REJECTED ?? 0);
  const pendingCount = statusCounts.PENDING ?? 0;
  const approvedCount = statusCounts.APPROVED ?? 0;

  const filtered = useMemo(() => {
    const base = videos.filter((video) => {
      if (queue === "ALL") return true;
      if (queue === "ISSUES") return video.status === "FLAGGED" || video.status === "REJECTED";
      return video.status === queue;
    });
    const sorted = [...base];
    if (sort === "most-views") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "highest-earned") sorted.sort((a, b) => b.earned - a.earned);
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [videos, queue, sort]);

  const queueOptions: Array<{ key: QueueKey; label: string }> = [
    { key: "ALL", label: `All (${statusCounts.ALL ?? videos.length})` },
    { key: "PENDING", label: `Pending (${pendingCount})` },
    { key: "ISSUES", label: `Issues (${issueCount})` },
    { key: "APPROVED", label: `Approved (${approvedCount})` },
  ];

  if (videos.length === 0) {
    return (
      <InlineEmptyState
        title={emptyState?.title ?? "No clips yet"}
        description={emptyState?.description ?? "Submitted clips will appear here once they are recorded."}
        primaryCta={emptyState?.primaryCta}
        secondaryCta={emptyState?.secondaryCta}
      />
    );
  }

  const colSpan = showCampaignColumn ? 8 : 7;

  return (
    <div className="overflow-x-auto">
      {campaignFilterLabel ? (
        <p className="mb-3 text-xs font-medium text-neutral-500">
          Showing clips for {campaignFilterLabel}
        </p>
      ) : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th className="w-14 px-2 py-3" aria-label="Preview"></th>
            <th className="px-2 py-3 text-left font-medium">Submitted</th>
            {showCampaignColumn ? (
              <th className="px-2 py-3 text-left font-medium">Campaign</th>
            ) : null}
            <th className="px-2 py-3 text-left font-medium">Status</th>
            <th className="px-2 py-3 text-left font-medium">Earned</th>
            <th className="px-2 py-3 text-left font-medium">Views</th>
            <th className="px-2 py-3 text-left font-medium">Platform</th>
            <th className="px-2 py-3 text-right font-medium">
              <div className="flex justify-end">
                <FilterMenu
                  queue={queue}
                  sort={sort}
                  queueOptions={queueOptions}
                  onQueueChange={setQueue}
                  onSortChange={setSort}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-2 py-10">
                <InlineEmptyState
                  title={`No ${queue.toLowerCase()} clips`}
                  description="Use another queue to view the rest of the submitted clips."
                  primaryCta={{ label: "Show all clips", onClick: () => setQueue("ALL") }}
                />
              </td>
            </tr>
          ) : null}
          {filtered.map((video) => {
            const href = `${detailBasePath.replace(/\/$/, "")}/${video.id}`;
            return (
              <tr
                key={video.id}
                className="cursor-pointer border-b border-neutral-100 transition-colors hover:bg-neutral-50"
              >
                <td className="px-2 py-3">
                  <Link href={href} className="block">
                    <ClipThumbnail
                      thumbnailUrl={video.thumbnailUrl}
                      mediaType={video.mediaType}
                      className="h-10 w-10 shrink-0 rounded-md"
                    />
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={href} className="block text-neutral-600">
                    {relativeTime(video.createdAt)}
                  </Link>
                </td>
                {showCampaignColumn ? (
                  <td className="px-2 py-3">
                    <Link href={href} className="block">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                        {video.campaignName}
                      </span>
                    </Link>
                  </td>
                ) : null}
                <td className="px-2 py-3">
                  <Link href={href} className="block">
                    <SubmissionStatusBadge status={video.status} />
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={href} className="block font-medium text-neutral-950">
                    ${video.earned.toFixed(2)}
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={href} className="block text-neutral-950">
                    {video.views.toLocaleString()}
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={href} className="block">
                    {video.platform ? <PlatformIcon platform={video.platform} size={28} /> : null}
                  </Link>
                </td>
                <td className="px-2 py-3 text-right">
                  {video.postUrl ? (
                    <a
                      href={video.postUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 underline-offset-2 hover:text-neutral-950 hover:underline"
                      title="Open post in new tab"
                    >
                      Open
                      <ExternalIcon />
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilterMenu({
  queue,
  sort,
  queueOptions,
  onQueueChange,
  onSortChange,
}: {
  queue: QueueKey;
  sort: SortKey;
  queueOptions: Array<{ key: QueueKey; label: string }>;
  onQueueChange: (queue: QueueKey) => void;
  onSortChange: (sort: SortKey) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          Filter options
          <ChevronDownIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border border-neutral-200 bg-white p-1 text-neutral-900 shadow-lg"
      >
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Queue
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={queue} onValueChange={(v) => onQueueChange(v as QueueKey)}>
          {queueOptions.map((option) => (
            <DropdownMenuRadioItem key={option.key} value={option.key}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Sort
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.key} value={option.key}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InlineEmptyState({
  title,
  description,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  description: string;
  primaryCta?: { label: string; href?: string; onClick?: () => void };
  secondaryCta?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="flex min-h-[220px] flex-col justify-center py-8">
      <h3 className="text-base font-semibold text-neutral-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
        {description}
      </p>
      {(primaryCta || secondaryCta) && (
        <div className="mt-5 flex flex-wrap gap-2">
          {primaryCta ? <InlineCta cta={primaryCta} primary /> : null}
          {secondaryCta ? <InlineCta cta={secondaryCta} /> : null}
        </div>
      )}
    </div>
  );
}

function InlineCta({
  cta,
  primary = false,
}: {
  cta: { label: string; href?: string; onClick?: () => void };
  primary?: boolean;
}) {
  const className = primary
    ? "inline-flex h-10 items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] hover:bg-neutral-800"
    : "inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950";

  if (cta.href) {
    return (
      <Link href={cta.href} className={className}>
        {cta.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={cta.onClick} className={className}>
      {cta.label}
    </button>
  );
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "#fff7ed", color: "#c2410c", label: "Pending" },
    FLAGGED: { bg: "#f5f3ff", color: "#7c3aed", label: "Flagged" },
    REJECTED: { bg: "#fef2f2", color: "#dc2626", label: "Rejected" },
    APPROVED: { bg: "#ecfdf5", color: "#059669", label: "Approved" },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}
