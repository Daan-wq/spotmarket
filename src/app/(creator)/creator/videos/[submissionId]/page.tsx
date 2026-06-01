import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import PlatformIcon from "@/components/shared/PlatformIcon";
import ClipThumbnail from "@/components/shared/ClipThumbnail";
import EarningsCard from "@/components/shared/EarningsCard";
import { resolveThumbnail } from "@/lib/clip-thumbnail";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import {
  submissionMinimumPaidViews,
  submissionNeedsPaidViewThreshold,
  submissionViews,
} from "@/lib/earnings";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatNumber, formatPercent, formatShortDate } from "@/lib/i18n-format";
import type { ReactNode } from "react";

const CLIP_TO_ICON: Record<ClipPlatform, string | null> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE_SHORTS",
  UNKNOWN: null,
};

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const { userId } = await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.videos.detail");
  const sharedT = await getTranslations("creator.shared");
  const statusT = await getTranslations("creator.shared.statuses.submission");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: submissionId },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
    },
  });

  if (!submission || submission.creatorId !== user.id) notFound();

  const views = submissionViews(submission);
  const likes = submission.likeCount ?? 0;
  const comments = submission.commentCount ?? 0;
  const shares = submission.shareCount ?? 0;
  const totalEngagement = views > 0 ? (((likes + comments + shares) / views) * 100) : 0;
  const rewardRate = Number(submission.campaign.creatorCpv) * 1000;
  const needsThreshold = submissionNeedsPaidViewThreshold(submission);
  const earnedAmount = Number(submission.earnedAmount ?? 0);
  const earningsMessage = needsThreshold
    ? t("thresholdMessage", {
        views: formatNumber(submissionMinimumPaidViews(submission), locale),
      })
    : null;
  const showEarningsDisclaimer = submission.status !== "APPROVED";
  const submissionPlatformIcon = CLIP_TO_ICON[parseClipUrl(submission.postUrl).platform];
  const storedMediaType =
    submission.mediaType === "video" ||
    submission.mediaType === "image" ||
    submission.mediaType === "carousel"
      ? submission.mediaType
      : null;
  const { thumbnailUrl, mediaType } = await resolveThumbnail(
    submission.postUrl,
    submission.thumbnailUrl,
    {
      creatorId: user.id,
      submissionId: submission.id,
      storedMediaType,
    },
  );

  const statusStyles: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)" },
    FLAGGED: { bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    REJECTED: { bg: "var(--error-bg)", color: "var(--error-text)" },
    APPROVED: { bg: "var(--success-bg)", color: "var(--success-text)" },
    BIO_FAILED: { bg: "var(--error-bg)", color: "var(--error-text)" },
  };
  const statusStyle = statusStyles[submission.status] ?? statusStyles.PENDING;

  const statIcons: Record<"views" | "likes" | "comments" | "shares", ReactNode> = {
    views: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    likes: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
      </svg>
    ),
    comments: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    shares: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
  };

  const stats = [
    { key: "views" as const, label: t("metrics.views"), value: formatNumber(views, locale) },
    { key: "likes" as const, label: t("metrics.likes"), value: formatNumber(likes, locale) },
    { key: "comments" as const, label: t("metrics.comments"), value: formatNumber(comments, locale) },
    { key: "shares" as const, label: t("metrics.shares"), value: formatNumber(shares, locale) },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 lg:p-6 w-full">
      {/* Left: 9:16 sticky preview, fixed width on desktop, stacks on mobile */}
      <div className="w-full max-w-[340px] mx-auto lg:mx-0 lg:flex-shrink-0 lg:w-[340px] lg:sticky lg:top-6 lg:self-start">
        <ClipThumbnail
          thumbnailUrl={thumbnailUrl}
          mediaType={mediaType}
          caption={submission.campaign.name}
          href={submission.postUrl}
          className="w-full rounded-2xl"
          dynamicAspectRatio
        />
      </div>

      {/* Right: content panel */}
      <div className="flex-1 min-w-0 max-w-2xl space-y-5">
        {/* Back link */}
        <Link
          href="/creator/videos"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t("back")}
        </Link>

        {/* Header: title + status badge inline */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1
            className="text-2xl lg:text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {submission.campaign.name}
          </h1>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {statusT(submission.status)}
          </span>
        </div>

        <EarningsCard
          amount={earnedAmount}
          message={earningsMessage}
          disclaimer={
            showEarningsDisclaimer
              ? t("earningsDisclaimer")
              : null
          }
        />

        {/* Engagement hero metric */}
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
        >
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            {t("engagement")}
          </div>
          <div className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatPercent(totalEngagement / 100, locale)}
          </div>
        </div>

        {/* 2x2 stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((m) => (
            <div
              key={m.label}
              className="p-3 rounded-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
            >
              <div
                className="flex items-center gap-1.5 text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                {statIcons[m.key]}
                {m.label}
              </div>
              <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Campaign Info */}
        <div>
          <div
            className="text-xs font-semibold tracking-wider uppercase mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            {t("campaign")}
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {submission.campaign.name}
          </div>
          <span
            className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            {t("rate", {
              amount: formatCurrency(rewardRate, locale),
            })}
          </span>
        </div>

        {/* Platform Info */}
        <div>
          <div
            className="text-xs font-semibold tracking-wider uppercase mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            {t("platform")}
          </div>
          <div className="flex items-center gap-1.5">
            {submissionPlatformIcon && (
              <PlatformIcon platform={submissionPlatformIcon} size={24} />
            )}
          </div>
        </div>

        {/* Dates */}
        <div>
          <div
            className="text-xs font-semibold tracking-wider uppercase mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            {t("dates")}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
              {t("uploaded")}
            </div>
            <span style={{ color: "var(--text-primary)" }}>
              {formatShortDate(submission.createdAt, locale)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Link
            href={`/creator/campaigns/${submission.campaign.id}`}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {sharedT("actions.viewCampaign")}
          </Link>
          {submission.postUrl && (
            <a
              href={submission.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {sharedT("actions.viewOriginalPost")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
