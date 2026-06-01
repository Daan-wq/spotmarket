"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PlatformIcon from "@/components/shared/PlatformIcon";
import ClipThumbnail from "@/components/shared/ClipThumbnail";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";
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
export type SubmittedClipEarningDisplay =
  | { state: "amount"; amount: number }
  | { state: "threshold"; minimumPaidViews: number };

export interface SubmittedClipData {
  id: string;
  postUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: SubmittedClipMediaType;
  status: string;
  earned: number;
  earningDisplay?: SubmittedClipEarningDisplay;
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

export function SubmittedClipsList({
  videos,
  statusCounts,
  mode,
  detailBasePath,
  campaignFilterLabel,
  showCampaignColumn = mode === "creator",
  emptyState,
}: SubmittedClipsListProps) {
  const locale = useLocale();
  const t = useTranslations("creator.videos.list");
  const sharedT = useTranslations("creator.shared");
  const statusT = useTranslations("creator.shared.statuses.submission");
  const [queue, setQueue] = useState<QueueKey>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  const issueCount =
    (statusCounts.FLAGGED ?? 0) +
    (statusCounts.REJECTED ?? 0) +
    (statusCounts.BIO_FAILED ?? 0);
  const pendingCount = statusCounts.PENDING ?? 0;
  const approvedCount = statusCounts.APPROVED ?? 0;

  const filtered = useMemo(() => {
    const base = videos.filter((video) => {
      if (queue === "ALL") return true;
      if (queue === "ISSUES") {
        return video.status === "FLAGGED" || video.status === "REJECTED" || video.status === "BIO_FAILED";
      }
      return video.status === queue;
    });
    const sorted = [...base];
    if (sort === "most-views") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "highest-earned") sorted.sort((a, b) => b.earned - a.earned);
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [videos, queue, sort]);

  const queueOptions: Array<{ key: QueueKey; label: string }> = [
    { key: "ALL", label: sharedT("filters.allClips", { count: statusCounts.ALL ?? videos.length }) },
    { key: "PENDING", label: sharedT("filters.pending", { count: pendingCount }) },
    { key: "ISSUES", label: sharedT("filters.issues", { count: issueCount }) },
    { key: "APPROVED", label: sharedT("filters.approved", { count: approvedCount }) },
  ];

  if (videos.length === 0) {
    return (
      <InlineEmptyState
        title={emptyState?.title ?? "No clips yet"}
        description={emptyState?.description ?? t("noClipsDescription")}
        primaryCta={emptyState?.primaryCta}
        secondaryCta={emptyState?.secondaryCta}
      />
    );
  }

  const colSpan = showCampaignColumn ? 8 : 7;

  return (
    <div>
      {campaignFilterLabel ? (
        <p className="mb-3 text-xs font-medium text-neutral-500">
          {t("showingCampaign", { campaign: campaignFilterLabel })}
        </p>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h2 className="shrink-0 text-sm font-semibold text-neutral-950">
            {t("trackingClips")}
          </h2>
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-medium text-neutral-500">
            {filtered.length}
          </span>
        </div>
        <FilterMenu
          queue={queue}
          sort={sort}
          queueOptions={queueOptions}
          onQueueChange={setQueue}
          onSortChange={setSort}
        />
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <InlineEmptyState
            title={t("noQueueTitle", { queue: statusLabel(queue, statusT).toLowerCase() })}
            description={t("noQueueDescription")}
            primaryCta={{ label: sharedT("actions.showAllClips"), onClick: () => setQueue("ALL") }}
          />
        ) : (
          filtered.map((video) => (
            <SubmittedClipCard
              key={video.id}
              video={video}
              href={`${detailBasePath.replace(/\/$/, "")}/${video.id}`}
              showCampaign={showCampaignColumn}
              locale={locale}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th className="w-14 px-2 py-3" aria-label={sharedT("labels.preview")}></th>
            <th className="px-2 py-3 text-left font-medium">{sharedT("labels.submitted")}</th>
            {showCampaignColumn ? (
              <th className="px-2 py-3 text-left font-medium">{sharedT("labels.campaign")}</th>
            ) : null}
            <th className="px-2 py-3 text-left font-medium">{sharedT("labels.status")}</th>
            <th className="px-2 py-3 text-left font-medium">{sharedT("labels.earned")}</th>
            <th className="px-2 py-3 text-left font-medium">{sharedT("labels.views")}</th>
            <th className="px-2 py-3 text-left font-medium">{sharedT("labels.platform")}</th>
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
                  title={t("noQueueTitle", { queue: statusLabel(queue, statusT).toLowerCase() })}
                  description={t("noQueueDescription")}
                  primaryCta={{ label: sharedT("actions.showAllClips"), onClick: () => setQueue("ALL") }}
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
                    {formatRelativeTime(video.createdAt, locale)}
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
                    <EarningValue video={video} locale={locale} />
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <Link href={href} className="block text-neutral-950">
                    {formatNumber(video.views, locale)}
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
                      title={sharedT("actions.openPost")}
                    >
                      {t("open")}
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
    </div>
  );
}

function SubmittedClipCard({
  video,
  href,
  showCampaign,
  locale,
}: {
  video: SubmittedClipData;
  href: string;
  showCampaign: boolean;
  locale: string;
}) {
  const t = useTranslations("creator.videos.list");
  const sharedT = useTranslations("creator.shared");
  return (
    <article className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start gap-3">
        <Link href={href} className="shrink-0">
          <ClipThumbnail
            thumbnailUrl={video.thumbnailUrl}
            mediaType={video.mediaType}
            className="h-14 w-14 rounded-xl"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="block">
            <p className="truncate text-sm font-semibold text-neutral-950">
              {showCampaign ? video.campaignName : t("submittedClip")}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {t("submittedRelative", { time: formatRelativeTime(video.createdAt, locale) })}
            </p>
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={video.status} />
            {video.platform ? <PlatformIcon platform={video.platform} size={24} /> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3 ring-1 ring-neutral-200">
          <p className="text-xs text-neutral-500">{sharedT("labels.earned")}</p>
          <EarningValue video={video} locale={locale} mobile />
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-neutral-200">
          <p className="text-xs text-neutral-500">{sharedT("labels.views")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-950">
            {formatNumber(video.views, locale)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={href}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition hover:bg-neutral-800"
        >
          {t("viewDetails")}
        </Link>
        {video.postUrl ? (
          <a
            href={video.postUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
          >
            {t("open")}
            <ExternalIcon />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function EarningValue({
  video,
  locale,
  mobile = false,
}: {
  video: SubmittedClipData;
  locale: string;
  mobile?: boolean;
}) {
  const t = useTranslations("creator.videos.list");
  const display = video.earningDisplay ?? {
    state: "amount" as const,
    amount: video.earned,
  };

  if (display.state === "threshold") {
    return (
      <span
        className={
          mobile
            ? "mt-1 block text-xs font-medium leading-5 text-neutral-600"
            : "block max-w-[240px] text-xs font-medium leading-5 text-neutral-600"
        }
      >
        {t("thresholdMessage", {
          views: formatNumber(display.minimumPaidViews, locale),
        })}
      </span>
    );
  }

  return (
    <span className={mobile ? "mt-1 block text-lg font-semibold text-neutral-950" : undefined}>
      {formatCurrency(display.amount, locale)}
    </span>
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
  const t = useTranslations("creator.videos.list");
  const sharedT = useTranslations("creator.shared");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          {t("filterOptions")}
          <ChevronDownIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border border-neutral-200 bg-white p-1 text-neutral-900 shadow-lg"
      >
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {sharedT("labels.queue")}
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
          {sharedT("labels.sort")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          {sortOptions(sharedT).map((option) => (
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
  const statusT = useTranslations("creator.shared.statuses.submission");
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "#fff7ed", color: "#c2410c", label: statusT("PENDING") },
    FLAGGED: { bg: "#f5f3ff", color: "#7c3aed", label: statusT("FLAGGED") },
    REJECTED: { bg: "#fef2f2", color: "#dc2626", label: statusT("REJECTED") },
    APPROVED: { bg: "#ecfdf5", color: "#059669", label: statusT("APPROVED") },
    BIO_FAILED: { bg: "#fef2f2", color: "#b91c1c", label: statusT("BIO_FAILED") },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function sortOptions(t: ReturnType<typeof useTranslations>): Array<{ key: SortKey; label: string }> {
  return [
    { key: "newest", label: t("filters.newest") },
    { key: "most-views", label: t("filters.mostViews") },
    { key: "highest-earned", label: t("filters.highestEarned") },
  ];
}

function statusLabel(
  queue: QueueKey,
  statusT: ReturnType<typeof useTranslations>,
): string {
  if (queue === "ISSUES") return "issues";
  if (queue === "ALL") return "all";
  return statusT(queue);
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
