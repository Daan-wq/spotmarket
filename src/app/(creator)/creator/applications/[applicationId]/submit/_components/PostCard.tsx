"use client";

import type { NormalizedPost } from "@/types/media";
import ClipThumbnail from "@/components/shared/ClipThumbnail";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n-format";

interface Props {
  post: NormalizedPost;
  isSelected: boolean;
  isSubmitted: boolean;
  isEligible: boolean;
  isSubmissionDisabled: boolean;
  onToggle: () => void;
}

export default function PostCard({
  post,
  isSelected,
  isSubmitted,
  isEligible,
  isSubmissionDisabled,
  onToggle,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("creator.applications.submit");
  const sharedT = useTranslations("creator.shared");
  const disabled = isSubmitted || isSubmissionDisabled;
  const postLabel = post.caption?.trim() || post.id;

  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-xl transition-all"
      style={{
        border: isSelected ? "3px solid var(--primary)" : "2px solid var(--border)",
        opacity: disabled ? 0.5 : isSelected ? 1 : 0.95,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? t("deselectPost") : t("selectPost")}: ${postLabel}`}
        onClick={onToggle}
        className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-default"
      />

      <ClipThumbnail
        thumbnailUrl={post.thumbnail}
        mediaType={post.mediaType}
        caption={post.caption}
        className="w-full h-full"
      />

      {isEligible && (
        <div
          className="absolute top-1.5 left-1.5 z-30 flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: "#22c55e" }}
          title={t("containsRequiredHashtags")}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {isSubmitted && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
          >
            {t("submitted")}
          </span>
        </div>
      )}

      {isSelected && !isSubmitted && (
        <div
          className="absolute top-1.5 right-1.5 z-30 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {!isSubmitted && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-end gap-2.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 text-white opacity-100 transition-opacity sm:justify-center sm:gap-3 sm:bg-black/60 sm:p-3 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <div className="flex items-center gap-3 text-xs font-semibold sm:gap-4 sm:text-sm">
            <span className="flex items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {formatNumber(post.likeCount ?? 0, locale)}
            </span>
            <span className="flex items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {formatNumber(post.commentCount ?? 0, locale)}
            </span>
          </div>

          <div className="flex w-full max-w-[9.5rem] flex-col gap-2">
            <span
              aria-hidden
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: isSubmissionDisabled
                  ? "#e5e5e5"
                  : isSelected
                    ? "#fff"
                    : "var(--primary)",
                color: isSubmissionDisabled
                  ? "var(--text-muted)"
                  : isSelected
                    ? "var(--primary)"
                    : "#fff",
              }}
            >
              {isSelected ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
              {isSelected ? t("selected") : t("submit")}
            </span>

            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="pointer-events-auto flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {sharedT("actions.open")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
