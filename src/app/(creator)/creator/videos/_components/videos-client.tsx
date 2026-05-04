"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import {
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
} from "../../_components/creator-journey";

interface UnderperformInfo {
  weakDimensions: string[];
  reason: string | null;
}

interface VideoData {
  id: string;
  postUrl: string | null;
  status: string;
  earned: number;
  views: number;
  createdAt: string;
  campaignName: string;
  brandName: string;
  platform: string;
  underperform?: UnderperformInfo | null;
}

interface VideosClientProps {
  videos: VideoData[];
  statusCounts: Record<string, number>;
}

type QueueKey = "ALL" | "PENDING" | "ISSUES" | "APPROVED";
type SortKey = "newest" | "most-views" | "highest-earned";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "most-views", label: "Most views" },
  { key: "highest-earned", label: "Highest earned" },
];

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "less than a minute ago";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function VideosClient({ videos, statusCounts }: VideosClientProps) {
  const [queue, setQueue] = useState<QueueKey>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const issueCount = (statusCounts.FLAGGED ?? 0) + (statusCounts.REJECTED ?? 0);
  const pendingCount = statusCounts.PENDING ?? 0;
  const approvedCount = statusCounts.APPROVED ?? 0;
  const totalEarned = videos.reduce((sum, video) => sum + video.earned, 0);
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);

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

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Clip review pipeline"
        title="Clips"
        description="Start with the current queue, then open stats or filters only when you need them."
      />

      <section className="border-y border-neutral-200 py-7">
        <CreatorSectionHeader
          title="Clip queue"
          description={queueDescription(queue, filtered.length)}
          action={
            <div className="flex flex-wrap gap-2">
              <ProgressiveActionDrawer
                triggerLabel="Queue options"
                title="Refine clip queue"
                description="Switch queue or sort order when the current list needs focus."
                variant="outline"
                badgeLabel={queue !== "ALL" ? queue.toLowerCase() : undefined}
              >
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-2">
                    <QueueButton active={queue === "ALL"} onClick={() => setQueue("ALL")}>All</QueueButton>
                    <QueueButton active={queue === "PENDING"} onClick={() => setQueue("PENDING")}>Pending ({pendingCount})</QueueButton>
                    <QueueButton active={queue === "ISSUES"} onClick={() => setQueue("ISSUES")}>Issues ({issueCount})</QueueButton>
                    <QueueButton active={queue === "APPROVED"} onClick={() => setQueue("APPROVED")}>Approved ({approvedCount})</QueueButton>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      Sort
                    </span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-400"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </ProgressiveActionDrawer>

              <ProgressiveActionDrawer
                triggerLabel="Snapshot"
                title="Clip snapshot"
                description="Totals are available here without taking over the queue."
                variant="outline"
                width="lg"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <SoftStat label="Total clips" value={videos.length.toString()} detail="All submissions" />
                  <SoftStat label="Total views" value={totalViews.toLocaleString()} detail="Tracked or claimed" />
                  <SoftStat label="Earned" value={`$${totalEarned.toFixed(2)}`} detail="Approved submissions" />
                </div>
              </ProgressiveActionDrawer>
            </div>
          }
        />

        {filtered.length === 0 ? (
          videos.length === 0 ? (
            <InlineEmptyState
              title="No clips yet"
              description="Submit your first clip from a campaign you've joined to start earning."
              primaryCta={{ label: "Browse campaigns", href: "/creator/campaigns" }}
              secondaryCta={{ label: "Connect an account", href: "/creator/connections" }}
            />
          ) : (
            <InlineEmptyState
              title={`No ${queue.toLowerCase()} clips`}
              description="Use another queue to keep reviewing submitted clips."
              primaryCta={{ label: "Show all clips", onClick: () => setQueue("ALL") }}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="px-2 py-3 text-left font-medium">Submitted</th>
                  <th className="px-2 py-3 text-left font-medium">Campaign</th>
                  <th className="px-2 py-3 text-left font-medium">Status</th>
                  <th className="px-2 py-3 text-left font-medium">Earned</th>
                  <th className="px-2 py-3 text-left font-medium">Views</th>
                  <th className="px-2 py-3 text-left font-medium">Platform</th>
                  <th className="px-2 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((video) => (
                  <Fragment key={video.id}>
                    <tr className="transition-colors" style={{ borderBottom: video.underperform ? undefined : "1px solid #f4f4f5" }}>
                      <td className="px-2 py-3">
                        <Link href={`/creator/videos/${video.id}`} className="block text-neutral-600">
                          {relativeTime(video.createdAt)}
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/creator/videos/${video.id}`} className="block">
                          <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                            {video.campaignName}
                          </span>
                          <div className="mt-1 text-xs text-neutral-500">by {video.brandName}</div>
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/creator/videos/${video.id}`} className="block">
                          <StatusBadge status={video.status} />
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/creator/videos/${video.id}`} className="block font-medium text-neutral-950">
                          ${video.earned.toFixed(2)}
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/creator/videos/${video.id}`} className="block text-neutral-950">
                          {video.views.toLocaleString()}
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/creator/videos/${video.id}`} className="block">
                          <PlatformIcon platform={video.platform} size={28} />
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
                    {video.underperform ? (
                      <tr className="border-b border-neutral-100">
                        <td colSpan={7} className="px-2 py-2">
                          <UnderperformNotice info={video.underperform} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function InlineEmptyState({
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

function queueDescription(queue: QueueKey, count: number) {
  if (queue === "PENDING") return `${count} clips waiting for review.`;
  if (queue === "ISSUES") return `${count} clips need attention before they can earn.`;
  if (queue === "APPROVED") return `${count} clips are approved and earning.`;
  return `${count} submitted clips across every status.`;
}

function QueueButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? "bg-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
          : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
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

const DIMENSION_LABEL: Record<string, string> = {
  views: "Low view velocity",
  likeRatio: "Low like ratio",
  commentRatio: "Low comment ratio",
  watchTime: "Short watch time",
};

const DIMENSION_HINT: Record<string, string> = {
  views: "Try a stronger hook in the first 2 seconds.",
  likeRatio: "Hook the emotion with surprise, awe, or a sharper take.",
  commentRatio: "End with a question or a take that invites replies.",
  watchTime: "Tighten the edit and drop the slow opening.",
};

function UnderperformNotice({ info }: { info: UnderperformInfo }) {
  const dims = info.weakDimensions.length > 0 ? info.weakDimensions : ["views"];
  return (
    <div className="flex gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
      <WarningIcon />
      <div className="flex-1">
        <p className="mb-1 text-xs font-semibold text-orange-700">
          Performance note
        </p>
        <div className="mb-1 flex flex-wrap gap-1.5">
          {dims.map((dimension) => (
            <span key={dimension} className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {DIMENSION_LABEL[dimension] ?? dimension}
            </span>
          ))}
        </div>
        <p className="text-xs text-neutral-600">
          {info.reason ?? dims.map((dimension) => DIMENSION_HINT[dimension]).filter(Boolean).join(" ")}
        </p>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
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
