"use client";

import { useState, useEffect, useCallback } from "react";

export interface PostStatus {
  id: string;
  status: "PENDING" | "RENDERING" | "QUEUED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
  errorMessage: string | null;
  igPermalink: string | null;
  publishedAt: string | null;
  igMediaId: string | null;
}

interface UseAutopostStatusReturn {
  status: PostStatus | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

export function useAutopostStatus(
  scheduledPostId: string | null
): UseAutopostStatusReturn {
  const [status, setStatus] = useState<PostStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (!scheduledPostId) return;

    try {
      const res = await fetch(`/api/autopost/status/${scheduledPostId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch status: ${res.status}`);
      }
      const data: PostStatus = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    }
  }, [scheduledPostId]);

  useEffect(() => {
    if (!scheduledPostId) return;

    setLoading(true);
    poll().then(() => setLoading(false));

    // Poll every 5s while status is not terminal
    const interval = setInterval(() => {
      if (
        status?.status === "PUBLISHED" ||
        status?.status === "FAILED"
      ) {
        return;
      }
      poll();
    }, 5000);

    return () => clearInterval(interval);
  }, [scheduledPostId, poll, status?.status]);

  const retry = useCallback(async () => {
    if (!scheduledPostId) return;
    setLoading(true);
    await poll();
    setLoading(false);
  }, [scheduledPostId, poll]);

  return { status, loading, error, retry };
}
