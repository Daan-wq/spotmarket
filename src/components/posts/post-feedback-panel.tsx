"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; email: string; role: string };
}

interface PostFeedbackPanelProps {
  postId: string;
  campaignId: string;
  status: string;
  brandDeclineReason: string | null;
  adminDeclineReason: string | null;
}

export function PostFeedbackPanel({
  postId,
  campaignId,
  status,
  brandDeclineReason,
  adminDeclineReason,
}: PostFeedbackPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}/posts/${postId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }, [campaignId, postId]);

  useEffect(() => {
    fetchComments();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`post-${postId}`);

    channel
      .on("broadcast", { event: "post:comment_added" }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/campaigns/${campaignId}/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });

    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    }
    setLoading(false);
  }

  const roleColors: Record<string, string> = {
    admin: "#7c3aed",
    creator: "#059669",
    network: "#d97706",
  };

  return (
    <div
      className="rounded-lg p-3 mt-2"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
    >
      {/* Decline reason banner */}
      {brandDeclineReason && (
        <div className="rounded-md px-3 py-2 mb-2 text-xs" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <span className="font-semibold">Brand declined:</span> {brandDeclineReason}
        </div>
      )}
      {adminDeclineReason && (
        <div className="rounded-md px-3 py-2 mb-2 text-xs" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <span className="font-semibold">Admin declined:</span> {adminDeclineReason}
        </div>
      )}

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="text-xs">
              <span
                className="font-semibold px-1.5 py-0.5 rounded mr-1"
                style={{ color: roleColors[c.author.role] ?? "var(--text-primary)" }}
              >
                {c.author.role}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>{c.content}</span>
              <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                {new Date(c.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {!["approved", "rejected"].includes(status) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add feedback or ask a question..."
            className="flex-1 px-3 py-1.5 text-xs rounded-md outline-none"
            style={{ background: "var(--muted)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--text-primary)" }}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
