"use client";

import type { NormalizedPost } from "@/types/media";

interface Props {
  post: NormalizedPost;
  isSelected: boolean;
  isSubmitted: boolean;
  isEligible: boolean;
  onToggle: () => void;
}

export default function PostCard({ post, isSelected, isSubmitted, isEligible, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      disabled={isSubmitted}
      className="relative rounded-lg overflow-hidden transition-all"
      style={{
        aspectRatio: "1",
        border: isSelected
          ? "3px solid var(--primary)"
          : "2px solid var(--border)",
        opacity: isSubmitted ? 0.5 : isSelected ? 1 : 0.85,
        cursor: isSubmitted ? "default" : "pointer",
      }}
    >
      {post.thumbnail ? (
        <img
          src={post.thumbnail}
          alt={post.caption?.slice(0, 30) ?? "Post"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "var(--bg-primary)" }}
        >
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {post.mediaType}
          </span>
        </div>
      )}

      {/* Video badge */}
      {post.mediaType === "video" && (
        <div className="absolute top-1.5 left-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="drop-shadow">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
      )}

      {/* Eligibility badge */}
      {isEligible && (
        <div
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "#22c55e" }}
          title="Contains required hashtags"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Submitted overlay */}
      {isSubmitted && (
        <div
          className="absolute inset-0 flex items-center justify-center"
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

      {/* Selected checkmark */}
      {isSelected && !isSubmitted && (
        <div
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Hover stats */}
      {!isSubmitted && (
        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {(post.likeCount ?? 0).toLocaleString()}
            </span>
            <span className="text-xs opacity-70">
              {new Date(post.publishedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
