"use client";

import { useState, useEffect, useCallback } from "react";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#6b7280",
  RENDERING: "#f59e0b",
  QUEUED: "#3b82f6",
  PUBLISHING: "#8b5cf6",
  PUBLISHED: "#22c55e",
  FAILED: "#ef4444",
};

interface IgAccount { id: string; platformUsername: string }

interface PostEntry {
  id: string;
  status: string;
  contentType: string | null;
  postType: string;
  caption: string;
  scheduledAt: string;
  publishedAt: string | null;
  igMediaId: string | null;
  errorMessage: string | null;
  campaignName: string | null;
  isOrganic: boolean;
  submissionStatus: string | null;
  permalink: string | null;
  sourceSchedule: { dayOfWeek: string; time: string } | null;
}

export function PostLog({ igAccounts }: { igAccounts: IgAccount[] }) {
  const [selectedAccount, setSelectedAccount] = useState(igAccounts[0]?.id || "");
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchLog = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/posts/log/${selectedAccount}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedAccount, page, statusFilter]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 600 }}>Post History</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 8px", fontSize: "12px" }}
          >
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            value={selectedAccount}
            onChange={e => { setSelectedAccount(e.target.value); setPage(1); }}
            style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 8px", fontSize: "12px" }}
          >
            {igAccounts.map(a => <option key={a.id} value={a.id}>@{a.platformUsername}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading...</p>
      ) : posts.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>No posts found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {posts.map(post => (
            <div
              key={post.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
              }}
            >
              <span style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: STATUS_COLORS[post.status] || "var(--text-muted)",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "2px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {post.status}
                  </span>
                  {post.contentType && (
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                      {post.contentType.replace("_", " ")}
                    </span>
                  )}
                  {post.isOrganic ? (
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Organic</span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "var(--accent)" }}>{post.campaignName}</span>
                  )}
                  {post.sourceSchedule && (
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      via schedule ({post.sourceSchedule.dayOfWeek.slice(0, 3)} {post.sourceSchedule.time})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.caption}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {new Date(post.scheduledAt).toLocaleDateString()}
                </div>
                {post.permalink && (
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}>
                    View →
                  </a>
                )}
                {post.errorMessage && (
                  <div style={{ fontSize: "10px", color: "#ef4444", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {post.errorMessage}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ padding: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            disabled={page * 20 >= total}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: page * 20 >= total ? "default" : "pointer", opacity: page * 20 >= total ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
