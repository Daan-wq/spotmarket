"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { BioVerificationBadge } from "@/components/admin/bio-verification-badge";

interface BioVerificationData {
  id: string;
  code: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  socialAccountId: string;
}

interface SocialAccount {
  id: string;
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
  bioVerifications?: BioVerificationData[];
  creatorProfile: {
    id: string;
    displayName: string;
    primaryGeo: string;
    walletAddress: string | null;
    socialAccounts: SocialAccount[];
  };
}

const statusStyle: Record<string, { backgroundColor: string; color: string }> = {
  pending:   { backgroundColor: "var(--warning-bg)", color: "var(--warning-text)" },
  approved:  { backgroundColor: "var(--success-bg)", color: "var(--success-text)" },
  active:    { backgroundColor: "var(--accent-bg)", color: "var(--accent-foreground)" },
  rejected:  { backgroundColor: "var(--error-bg)", color: "var(--error-text)" },
  completed: { backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" },
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
    submitted:       { bg: "var(--warning-bg)", text: "var(--warning-text)", label: "Pending Brand" },
    brand_approved:  { bg: "var(--accent-bg)", text: "var(--accent-foreground)", label: "Brand OK · Pending Admin" },
    brand_rejected:  { bg: "var(--error-bg)", text: "var(--error-text)", label: "Brand Declined" },
    approved:        { bg: "var(--success-bg)", text: "var(--success-text)", label: "Approved" },
    rejected:        { bg: "var(--error-bg)", text: "var(--error-text)", label: "Rejected" },
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
        const colors = statusStyle[app.status] ?? { backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" };

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
                    <span className="text-xs" style={{ color: "var(--warning)" }}>No Instagram connected</span>
                  )}
                </div>

                {/* Bio Verification */}
                {igAccount && (
                  <div className="mb-3">
                    <BioVerificationBadge
                      verificationId={app.bioVerifications?.[0]?.id}
                      code={app.bioVerifications?.[0]?.code}
                      status={app.bioVerifications?.[0]?.status ?? null}
                      applicationId={app.id}
                      socialAccountId={igAccount.id}
                    />
                  </div>
                )}

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
                                  style={{ color: "var(--accent)" }}
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
                                <p className="text-xs mb-2 px-2 py-1 rounded" style={{ background: "var(--error-bg)", color: "var(--error-text)" }}>
                                  Brand: {post.brandDeclineReason}
                                </p>
                              )}
                              {canAdminReview && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => reviewPost(post.id, "approve")}
                                    disabled={postProcessing === post.id}
                                    className="px-2 py-1 text-xs font-medium text-white rounded cursor-pointer disabled:opacity-50"
                                    style={{ background: "var(--success)" }}
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
                                    style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
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
                    style={{ background: "var(--success)" }}
                    onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLElement).style.background = "var(--success-text)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--success)"; }}
                  >
                    {isProcessing ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: "var(--error-bg)", color: "var(--error-text)", border: "1px solid var(--error-bg)" }}
                    onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLElement).style.background = "var(--error-bg)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--error-bg)"; }}
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
