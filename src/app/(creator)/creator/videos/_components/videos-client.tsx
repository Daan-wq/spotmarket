"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CreatorJourney,
  CreatorPageHeader,
  CreatorSectionHeader,
  SoftStat,
  type JourneyStepItem,
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

  const steps: JourneyStepItem[] = [
    {
      id: "submit",
      label: "Submit clips from joined campaigns",
      description: "Clips enter this pipeline after you submit a campaign post URL.",
      status: videos.length > 0 ? "complete" : "current",
      meta: videos.length > 0 ? `${videos.length} submitted clip${videos.length === 1 ? "" : "s"}` : "No submitted clips yet",
      cta: videos.length > 0 ? undefined : { label: "Browse campaigns", href: "/creator/campaigns" },
    },
    {
      id: "pending",
      label: "Wait for review",
      description: "Pending clips are being checked before earnings are locked.",
      status: pendingCount > 0 ? "current" : videos.length > 0 ? "complete" : "blocked",
      meta: `${pendingCount} pending`,
      cta: pendingCount > 0 ? { label: "Show pending", onClick: () => setQueue("PENDING") } : undefined,
    },
    {
      id: "issues",
      label: "Fix rejected or flagged clips",
      description: "Use this queue when a clip needs edits, proof, or a stronger next attempt.",
      status: issueCount > 0 ? "attention" : videos.length > 0 ? "complete" : "blocked",
      meta: `${issueCount} need attention`,
      cta: issueCount > 0 ? { label: "Show issues", onClick: () => setQueue("ISSUES") } : undefined,
    },
    {
      id: "approved",
      label: "Track approved earnings",
      description: "Approved clips become the source for settled earnings and payout history.",
      status: approvedCount > 0 ? "complete" : videos.length > 0 ? "current" : "blocked",
      meta: `${approvedCount} approved`,
      cta: approvedCount > 0 ? { label: "Show approved", onClick: () => setQueue("APPROVED") } : undefined,
    },
  ];

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Clip review pipeline"
        title="Clips"
        description="Follow submitted content from review to fixes to approved earnings."
      />

      <CreatorJourney
        title="Review moves in order"
        description="The page now starts with the review sequence. The clip table stays below for detailed scanning."
        steps={steps}
      />

      <section>
        <CreatorSectionHeader title="Clip snapshot" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SoftStat label="Total clips" value={videos.length.toString()} detail="All submissions" />
          <SoftStat label="Total views" value={totalViews.toLocaleString()} detail="Tracked or claimed" />
          <SoftStat label="Earned" value={`$${totalEarned.toFixed(2)}`} detail="Approved submissions" />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <CreatorSectionHeader
            title="Clip queue"
            description={queueDescription(queue, filtered.length)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <QueueButton active={queue === "ALL"} onClick={() => setQueue("ALL")}>All</QueueButton>
            <QueueButton active={queue === "PENDING"} onClick={() => setQueue("PENDING")}>Pending</QueueButton>
            <QueueButton active={queue === "ISSUES"} onClick={() => setQueue("ISSUES")}>Issues</QueueButton>
            <QueueButton active={queue === "APPROVED"} onClick={() => setQueue("APPROVED")}>Approved</QueueButton>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-400"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          videos.length === 0 ? (
            <EmptyState
              title="No clips yet"
              description="Submit your first clip from a campaign you've joined to start earning."
              primaryCta={{ label: "Browse campaigns", href: "/creator/campaigns" }}
              secondaryCta={{ label: "Connect an account", href: "/creator/connections" }}
            />
          ) : (
            <EmptyState
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
