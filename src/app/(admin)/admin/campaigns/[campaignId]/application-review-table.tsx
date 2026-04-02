"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";

interface SocialAccount {
  platform: string;
  platformUsername: string;
  followerCount: number;
  engagementRate: { toString(): string } | string | number;
  lastSyncedAt: Date | string | null;
}

interface PostData {
  id: string;
  postUrl: string;
  status: string;
  submittedAt: Date | string;
  verifiedViews: number;
  brandDeclineReason: string | null;
  adminDeclineReason: string | null;
  brandReviewedAt: Date | string | null;
  sourceType: string;
}

interface Application {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  followerSnapshot: number | null;
  engagementSnapshot: string | number | { toString(): string } | null;
  reviewNotes: string | null;
  posts?: PostData[];
  creatorProfile: {
    id: string;
    displayName: string;
    primaryGeo: string;
    walletAddress: string | null;
    socialAccounts: SocialAccount[];
  };
}

const statusStyle: Record<string, { backgroundColor: string; color: string }> = {
  pending:   { backgroundColor: "#fffbeb", color: "#b45309" },
  approved:  { backgroundColor: "#f0fdf4", color: "#15803d" },
  active:    { backgroundColor: "#eff6ff", color: "#1d4ed8" },
  rejected:  { backgroundColor: "#fef2f2", color: "#b91c1c" },
  completed: { backgroundColor: "#f1f5f9", color: "#475569" },
};

export function ApplicationReviewTable({
  applications,
  campaignId,
}: {
  applications: Application[];
  campaignId: string;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [postProcessing, setPostProcessing] = useState<string | null>(null);
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});

  async function updateStatus(applicationId: string, status: "approved" | "rejected") {
    setProcessing(applicationId);
    await fetch(`/api/campaigns/${campaignId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNotes: notes[applicationId] ?? "" }),
    });
    router.refresh();
    setProcessing(null);
  }

  async function reviewPost(postId: string, action: "approve" | "decline") {
    if (action === "decline" && !declineReasons[postId]?.trim()) return;
    setPostProcessing(postId);
    await fetch(`/api/campaigns/${campaignId}/posts/${postId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: action === "decline" ? declineReasons[postId] : undefined,
      }),
    });
    router.refresh();
    setPostProcessing(null);
  }

  function togglePosts(appId: string) {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  }

  const postStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
    submitted:       { bg: "#fffbeb", text: "#92400e", label: "Pending Brand" },
    brand_approved:  { bg: "#dbeafe", text: "#1d4ed8", label: "Brand OK · Pending Admin" },
    brand_rejected:  { bg: "#fef2f2", text: "#b91c1c", label: "Brand Declined" },
    approved:        { bg: "#f0fdf4", text: "#15803d", label: "Approved" },
    rejected:        { bg: "#fef2f2", text: "#b91c1c", label: "Rejected" },
  };

  if (applications.length === 0) {
    return (
      <div className="px-5 py-12 text-center" style={{ background: "var(--bg-elevated)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No applications yet.</p>
      </div>
    );
  }

  const pending = applications.filter((a) => a.status === "pending");
  const rest = applications.filter((a) => a.status !== "pending");

  return (
    <div style={{ background: "var(--bg-elevated)" }}>
      {[...pending, ...rest].map((app, i) => {
        const igAccount = app.creatorProfile.socialAccounts.find((a) => a.platform === "instagram");
        const isPending = app.status === "pending";
        const isProcessing = processing === app.id;
        const colors = statusStyle[app.status] ?? { backgroundColor: "#f1f5f9", color: "#475569" };

        return (
          <div
            key={app.id}
            className="px-5 py-5"
            style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                {/* Name + status */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {app.creatorProfile.displayName}
                  </p>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    ({app.creatorProfile.primaryGeo})
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={colors}>
                    {app.status}
                  </span>
                </div>

                {/* Social stats */}
                <div className="flex flex-wrap gap-4 mb-3">
                  {igAccount ? (
                    <>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>@{igAccount.platformUsername} (Instagram)</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Followers: <strong style={{ color: "var(--text-primary)" }}>{igAccount.followerCount.toLocaleString()}</strong>
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Engagement: <strong style={{ color: "var(--text-primary)" }}>{igAccount.engagementRate.toString()}%</strong>
                      </span>
                      {igAccount.lastSyncedAt && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Synced {new Date(igAccount.lastSyncedAt).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: "#d97706" }}>No Instagram connected</span>
                  )}
                </div>

                {/* Snapshot */}
                {app.followerSnapshot && (
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                    At application: {app.followerSnapshot.toLocaleString()} followers · {app.engagementSnapshot?.toString()}% engagement
                  </p>
                )}

                {/* Review notes */}
                {isPending && (
                  <textarea
                    value={notes[app.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                    placeholder="Optional review note..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all resize-none"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                )}
                {!isPending && app.reviewNotes && (
                  <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Note: {app.reviewNotes}</p>
                )}

                {/* Posts expansion */}
                {app.posts && app.posts.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => togglePosts(app.id)}
                      className="text-xs font-medium cursor-pointer hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      {expandedPosts.has(app.id) ? "▼" : "▶"} {app.posts.length} post{app.posts.length !== 1 ? "s" : ""} submitted
                    </button>

                    {expandedPosts.has(app.id) && (
                      <div className="mt-2 space-y-2">
                        {app.posts.map((post) => {
                          const ps = postStatusStyle[post.status] ?? postStatusStyle.submitted;
                          const canAdminReview = ["submitted", "brand_approved", "brand_rejected"].includes(post.status);
                          return (
                            <div
                              key={post.id}
                              className="rounded-lg px-3 py-3"
                              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <a
                                  href={post.postUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs hover:underline truncate"
                                  style={{ color: "#3b82f6" }}
                                >
                                  {post.postUrl}
                                </a>
                                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: ps.bg, color: ps.text }}>
                                  {ps.label}
                                </span>
                              </div>
                              <div className="flex gap-3 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                                <span>{new Date(post.submittedAt).toLocaleDateString()}</span>
                                <span>{post.verifiedViews.toLocaleString()} views</span>
                                <span className="capitalize">{post.sourceType.toLowerCase()}</span>
                              </div>
                              {post.brandDeclineReason && (
                                <p className="text-xs mb-2 px-2 py-1 rounded" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                                  Brand: {post.brandDeclineReason}
                                </p>
                              )}
                              {canAdminReview && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => reviewPost(post.id, "approve")}
                                    disabled={postProcessing === post.id}
                                    className="px-2 py-1 text-xs font-medium text-white rounded cursor-pointer disabled:opacity-50"
                                    style={{ background: "#16a34a" }}
                                  >
                                    {postProcessing === post.id ? "…" : "Approve"}
                                  </button>
                                  <input
                                    type="text"
                                    value={declineReasons[post.id] ?? ""}
                                    onChange={(e) => setDeclineReasons({ ...declineReasons, [post.id]: e.target.value })}
                                    placeholder="Decline reason..."
                                    className="text-xs px-2 py-1 rounded flex-1"
                                    style={{ border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                                  />
                                  <button
                                    onClick={() => reviewPost(post.id, "decline")}
                                    disabled={postProcessing === post.id || !declineReasons[post.id]?.trim()}
                                    className="px-2 py-1 text-xs font-medium rounded cursor-pointer disabled:opacity-50"
                                    style={{ background: "#fef2f2", color: "#b91c1c" }}
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {isPending && (
                <div className="shrink-0 flex gap-2">
                  <button
                    onClick={() => updateStatus(app.id, "approved")}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: "#16a34a" }}
                    onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLElement).style.background = "#15803d"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
                  >
                    {isProcessing ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
                    onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLElement).style.background = "#fee2e2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
