"use client";

import { useAutopostStatus, type PostStatus } from "@/hooks/useAutopostStatus";

interface PostStatusCardProps {
  scheduledPostId: string;
  campaignName: string;
  onDismiss?: () => void;
}

function getStatusLabel(status: PostStatus["status"]): string {
  const labels: Record<PostStatus["status"], string> = {
    PENDING: "Waiting to start...",
    RENDERING: "Compositing overlay...",
    QUEUED: "Sending to Instagram...",
    PUBLISHING: "Waiting for Instagram to process...",
    PUBLISHED: "Posted successfully",
    FAILED: "Failed to post",
  };
  return labels[status];
}

export function PostStatusCard({
  scheduledPostId,
  campaignName,
  onDismiss,
}: PostStatusCardProps) {
  const { status, loading, error, retry } = useAutopostStatus(scheduledPostId);

  if (!status && loading) {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          minHeight: "80px",
        }}
      >
        <style>{`
          @keyframes autopost-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: "var(--accent)",
            animation: "autopost-spin 1s linear infinite",
            flexShrink: 0,
          }}
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a10 10 0 0 1 0 20"></path>
        </svg>
        <div className="flex-1 min-w-0">
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {campaignName}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  if (status.status === "PUBLISHED") {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: "var(--success-bg)",
          border: "1px solid var(--border)",
          minHeight: "80px",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#10b981", flexShrink: 0 }}
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold"
            style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}
          >
            Posted successfully
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
            {campaignName}
          </p>
          {status.publishedAt && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              {new Date(status.publishedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status.igPermalink && (
            <a
              href={status.igPermalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:no-underline"
              style={{ color: "var(--accent)" }}
            >
              View post
            </a>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              x
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status.status === "FAILED") {
    return (
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{
          background: "var(--error-bg)",
          border: "1px solid var(--border)",
          minHeight: "80px",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }}
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold"
            style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}
          >
            Failed to post
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
            {campaignName}
          </p>
          {status.errorMessage && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }} className="mt-1">
              {status.errorMessage}
            </p>
          )}
        </div>
        <button
          onClick={retry}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {loading ? "Retrying..." : "Retry"}
        </button>
      </div>
    );
  }

  // Active states: PENDING, RENDERING, QUEUED, PUBLISHING
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        minHeight: "80px",
      }}
    >
      <style>{`
        @keyframes autopost-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{
          color: "var(--accent)",
          animation: "autopost-spin 1s linear infinite",
          flexShrink: 0,
        }}
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a10 10 0 0 1 0 20"></path>
      </svg>
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold"
          style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}
        >
          {getStatusLabel(status.status)}
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
          {campaignName}
        </p>
      </div>
    </div>
  );
}
