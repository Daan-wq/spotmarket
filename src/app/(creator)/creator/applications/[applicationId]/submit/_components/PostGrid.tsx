"use client";

import type { NormalizedPost } from "@/types/media";
import PostCard from "./PostCard";
import Link from "next/link";

interface Props {
  posts: NormalizedPost[];
  isLoading: boolean;
  selectedUrls: Set<string>;
  submittedUrls: Set<string>;
  requiredHashtags: string[];
  hasConnectedAccount: boolean;
  platform: "ig" | "tt" | "fb";
  onToggle: (url: string) => void;
}

const PLATFORM_NAMES = { ig: "Instagram", tt: "TikTok", fb: "Facebook" };

export default function PostGrid({
  posts,
  isLoading,
  selectedUrls,
  submittedUrls,
  requiredHashtags,
  hasConnectedAccount,
  platform,
  onToggle,
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
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg animate-pulse"
            style={{ aspectRatio: "1", background: "var(--bg-primary)" }}
          />
        ))}
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
      {posts.map((post) => {
        const eligible =
          requiredHashtags.length > 0 &&
          !!post.caption &&
          requiredHashtags.every((tag) =>
            post.caption!.toLowerCase().includes(tag.toLowerCase())
          );
        return (
          <PostCard
            key={post.id}
            post={post}
            isSelected={selectedUrls.has(post.url)}
            isSubmitted={submittedUrls.has(post.url)}
            isEligible={eligible}
            onToggle={() => onToggle(post.url)}
          />
        );
      })}
    </div>
  );
}
