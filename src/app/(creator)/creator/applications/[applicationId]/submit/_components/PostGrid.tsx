"use client";

import type { NormalizedPost } from "@/types/media";
import PostCard from "./PostCard";
import Link from "next/link";

interface Props {
  posts: NormalizedPost[];
  isLoading: boolean;
  selectedKeys: Set<string>;
  submittedKeys: Set<string>;
  submittingKeys: Set<string>;
  requiredHashtags: string[];
  hasConnectedAccount: boolean;
  platform: "ig" | "tt" | "yt" | "fb";
  isSubmissionDisabled: boolean;
  onToggle: (post: NormalizedPost) => void;
  onSubmitOne: (post: NormalizedPost) => void;
}

const PLATFORM_NAMES = { ig: "Instagram", tt: "TikTok", yt: "YouTube", fb: "Facebook" };

// Must mirror keyOf() in SubmitPageClient.
const keyOf = (p: { platform: NormalizedPost["platform"]; id: string }) =>
  `${p.platform}:${p.id}`;

export default function PostGrid({
  posts,
  isLoading,
  selectedKeys,
  submittedKeys,
  submittingKeys,
  requiredHashtags,
  hasConnectedAccount,
  platform,
  isSubmissionDisabled,
  onToggle,
  onSubmitOne,
}: Props) {
  if (!hasConnectedAccount) {
    return (
      <div className="text-center py-14">
        <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
          No {PLATFORM_NAMES[platform]} account connected.
        </p>
        <Link
          href="/creator/connections"
          className="text-sm font-medium underline"
          style={{ color: "var(--primary)" }}
        >
          Connect on Connections →
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div
          className="flex items-center gap-2 mb-3 text-sm"
          style={{ color: "var(--text-muted)" }}
          role="status"
          aria-live="polite"
        >
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading {PLATFORM_NAMES[platform]} posts…
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg skeleton-shimmer"
              style={{ aspectRatio: "1" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-14">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No posts match your filters.{" "}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {posts.map((post, index) => {
        const eligible =
          requiredHashtags.length > 0 &&
          !!post.caption &&
          requiredHashtags.every((tag) =>
            post.caption!.toLowerCase().includes(tag.toLowerCase())
          );
        const k = keyOf(post);
        return (
          <div
            key={k}
            id={`submit-card-${k}`}
            data-first-clip-target={index === 0 ? "submit-post-card" : undefined}
          >
            <PostCard
              post={post}
              isSelected={selectedKeys.has(k)}
              isSubmitted={submittedKeys.has(k)}
              isSubmittingOne={submittingKeys.has(k)}
              isEligible={eligible}
              isSubmissionDisabled={isSubmissionDisabled}
              onToggle={() => onToggle(post)}
              onSubmitOne={() => onSubmitOne(post)}
            />
          </div>
        );
      })}
    </div>
  );
}
