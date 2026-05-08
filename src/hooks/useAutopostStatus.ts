"use client";

import { useQuery } from "@tanstack/react-query";

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

const POLL_INTERVAL_MS = 5_000;

export function useAutopostStatus(
  scheduledPostId: string | null
): UseAutopostStatusReturn {
  const query = useQuery({
    queryKey: ["autopost-status", scheduledPostId],
    queryFn: async (): Promise<PostStatus> => {
      const res = await fetch(`/api/autopost/status/${scheduledPostId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch status: ${res.status}`);
      }
      return (await res.json()) as PostStatus;
    },
    enabled: !!scheduledPostId,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data?.status === "PUBLISHED" || data?.status === "FAILED") return false;
      return POLL_INTERVAL_MS;
    },
  });

  return {
    status: query.data ?? null,
    loading: query.isPending && !!scheduledPostId,
    error: query.error instanceof Error ? query.error.message : null,
    retry: async () => {
      await query.refetch();
    },
  };
}
