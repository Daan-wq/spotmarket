"use client";

import type { NormalizedPost } from "@/types/media";
import ClipThumbnail from "@/components/shared/ClipThumbnail";

interface Props {
  post: NormalizedPost;
  isSelected: boolean;
  isSubmitted: boolean;
  isEligible: boolean;
  isSubmittingOne: boolean;
  isSubmissionDisabled: boolean;
  onToggle: () => void;
  onSubmitOne: () => void;
}

export default function PostCard({
  post,
  isSelected,
  isSubmitted,
  isEligible,
  isSubmittingOne,
  isSubmissionDisabled,
  onToggle,
  onSubmitOne,
}: Props) {
  const showHover = !isSubmitted && !isSelected;
  const disabled = isSubmitted || isSubmissionDisabled;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onToggle();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="group relative rounded-lg overflow-hidden transition-all"
      style={{
        aspectRatio: "1",
        border: isSelected ? "3px solid var(--primary)" : "2px solid var(--border)",
        opacity: disabled ? 0.5 : isSelected ? 1 : 0.95,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <ClipThumbnail
        thumbnailUrl={post.thumbnail}
        mediaType={post.mediaType}
        caption={post.caption}
        className="w-full h-full"
      />

      {isEligible && (
        <div
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
          style={{ background: "#22c55e" }}
          title="Contains required hashtags"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {isSubmitted && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
          >
            Submitted
          </span>
        </div>
      )}

      {isSelected && !isSubmitted && (
        <div
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {showHover && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-3 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto text-white"
        >
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="flex items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {(post.likeCount ?? 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {(post.commentCount ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="flex gap-2">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open
            </a>
            <button
              type="button"
              disabled={isSubmittingOne || isSubmissionDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (isSubmittingOne || isSubmissionDisabled) return;
                onSubmitOne();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-100"
              style={{
                background: isSubmissionDisabled ? "#e5e5e5" : "var(--primary)",
                color: isSubmissionDisabled ? "var(--text-muted)" : "#fff",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {isSubmittingOne ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
