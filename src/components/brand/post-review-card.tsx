"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostReviewCardProps {
  post: {
    id: string;
    postUrl: string;
    platformPostId: string;
    status: string;
    submittedAt: Date;
    verifiedViews: number;
    brandDeclineReason: string | null;
    adminDeclineReason: string | null;
    application: {
      creatorProfile: { displayName: string; avatarUrl: string | null } | null;
    };
    socialAccount: { platformUsername: string; followerCount: number } | null;
    comments: {
      id: string;
      content: string;
      createdAt: Date;
      author: { email: string; role: string };
    }[];
  };
  campaignId: string;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  submitted:       { bg: "#fffbeb", text: "#92400e", label: "Pending Review" },
  brand_approved:  { bg: "#dbeafe", text: "#1d4ed8", label: "Brand Approved" },
  brand_rejected:  { bg: "#fef2f2", text: "#b91c1c", label: "Brand Declined" },
  approved:        { bg: "#f0fdf4", text: "#15803d", label: "Approved" },
  rejected:        { bg: "#fef2f2", text: "#b91c1c", label: "Rejected" },
};

export function PostReviewCard({ post, campaignId }: PostReviewCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPending = post.status === "submitted";
  const style = statusStyles[post.status] ?? statusStyles.submitted;

  async function handleReview(action: "approve" | "decline") {
    if (action === "decline" && !reason.trim()) {
      setError("Please provide a decline reason");
      return;
    }
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/campaigns/${campaignId}/posts/${post.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: action === "decline" ? reason : undefined,
        comment: comment.trim() || undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }

    setShowDecline(false);
    setReason("");
    setComment("");
    router.refresh();
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "var(--text-primary)" }}
          >
            {post.application.creatorProfile?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {post.application.creatorProfile?.displayName ?? "Unknown Creator"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              @{post.socialAccount?.platformUsername ?? "—"} · {(post.socialAccount?.followerCount ?? 0).toLocaleString()} followers
            </p>
          </div>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: style.bg, color: style.text }}
        >
          {style.label}
        </span>
      </div>

      {/* Post link */}
      <a
        href={post.postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm hover:underline mb-3 inline-block"
        style={{ color: "#3b82f6" }}
      >
        View post on Instagram →
      </a>

      <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>Submitted {new Date(post.submittedAt).toLocaleDateString()}</span>
        <span>{post.verifiedViews.toLocaleString()} views</span>
      </div>

      {/* Decline reason display */}
      {post.brandDeclineReason && (
        <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <span className="font-medium">Decline reason:</span> {post.brandDeclineReason}
        </div>
      )}
      {post.adminDeclineReason && (
        <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <span className="font-medium">Admin decline:</span> {post.adminDeclineReason}
        </div>
      )}

      {/* Recent comments */}
      {post.comments.length > 0 && (
        <div className="mb-3 space-y-2">
          {post.comments.map((c) => (
            <div key={c.id} className="text-xs rounded-lg px-3 py-2" style={{ background: "var(--muted)" }}>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{c.author.role}:</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{c.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review actions */}
      {isPending && (
        <div className="pt-3" style={{ borderTop: "1px solid var(--muted)" }}>
          {/* Optional comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            rows={2}
            className="w-full px-3 py-2 mb-3 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: "var(--muted)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />

          {showDecline ? (
            <div className="space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you declining this post? (required)"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview("decline")}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 cursor-pointer"
                  style={{ background: "#b91c1c" }}
                >
                  {loading ? "Declining..." : "Confirm Decline"}
                </button>
                <button
                  onClick={() => { setShowDecline(false); setReason(""); }}
                  className="px-3 py-1.5 text-sm rounded-lg cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleReview("approve")}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 cursor-pointer"
                style={{ background: "#15803d" }}
              >
                {loading ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => setShowDecline(true)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 cursor-pointer"
                style={{ background: "#fef2f2", color: "#b91c1c" }}
              >
                Decline
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
