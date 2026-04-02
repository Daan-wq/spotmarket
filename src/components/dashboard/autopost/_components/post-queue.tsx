"use client";

import { useState } from "react";
import { PostStatusCard } from "./post-status-card";

export interface QueuedPost {
  scheduledPostId: string;
  campaignName: string;
}

interface PostQueueProps {
  posts: QueuedPost[];
}

export function PostQueue({ posts: initialPosts }: PostQueueProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = (scheduledPostId: string) => {
    setDismissedIds((prev) => new Set(prev).add(scheduledPostId));
  };

  const visiblePosts = posts.filter((p) => !dismissedIds.has(p.scheduledPostId));

  if (visiblePosts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Post Queue ({visiblePosts.length})
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {visiblePosts
          .slice()
          .reverse()
          .map((post) => (
            <PostStatusCard
              key={post.scheduledPostId}
              scheduledPostId={post.scheduledPostId}
              campaignName={post.campaignName}
              onDismiss={() => handleDismiss(post.scheduledPostId)}
            />
          ))}
      </div>
    </div>
  );
}
