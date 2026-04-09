"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

interface MediaItem {
  id: string;
  caption: string | null;
  media_type: string;
  media_product_type: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  media_url: string | null;
  thumbnail_url: string | null;
}

interface Connection {
  id: string;
  igUsername: string;
  media: MediaItem[];
}

type Mode = "select" | "manual";

export default function SubmitPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const applicationId = params.applicationId as string;
  const preselectedUrl = searchParams.get("mediaUrl");

  const [mode, setMode] = useState<Mode>("select");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState<string | null>(null);

  // Manual mode state
  const [postUrl, setPostUrl] = useState(preselectedUrl ?? "");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  useEffect(() => {
    fetchMedia();
    fetchCampaignName();
  }, []);

  async function fetchCampaignName() {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaignName(data.campaignName ?? null);
      }
    } catch { /* non-fatal */ }
  }

  async function fetchMedia() {
    try {
      const res = await fetch("/api/creator/media");
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      const conns: Connection[] = data.connections ?? [];
      setConnections(conns);
      if (conns.length > 0) {
        setActiveConnection(conns[0].id);
        // Pre-select post if mediaUrl param is present
        if (preselectedUrl) {
          for (const conn of conns) {
            const match = conn.media.find((m) => m.permalink === preselectedUrl);
            if (match) {
              setActiveConnection(conn.id);
              setSelectedPosts(new Set([match.permalink]));
              break;
            }
          }
        }
      } else {
        // No pages connected — fall back to manual
        setMode("manual");
      }
    } catch {
      setMode("manual");
    } finally {
      setLoadingMedia(false);
    }
  }

  const activeMedia = connections.find((c) => c.id === activeConnection)?.media ?? [];

  function togglePost(permalink: string) {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(permalink)) next.delete(permalink);
      else next.add(permalink);
      return next;
    });
  }

  async function submitSelected() {
    if (selectedPosts.size === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const urls = Array.from(selectedPosts);
    let submitted = 0;

    for (const url of urls) {
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, postUrl: url }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Failed to submit ${url}`);
        } else {
          submitted++;
        }
      } catch {
        setError(`Failed to submit ${url}`);
      }
    }

    setSubmitting(false);
    if (submitted > 0) {
      if (submitted === urls.length) {
        router.push(`/creator/applications/${applicationId}`);
      } else {
        setSuccess(`${submitted} of ${urls.length} posts submitted.`);
      }
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          postUrl,
          screenshotUrl: screenshotUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit");
        return;
      }
      router.push(`/creator/applications/${applicationId}`);
    } catch {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Submit Content{campaignName ? ` for ${campaignName}` : ""}
      </h1>

      {/* Info banner */}
      <div
        className="rounded-lg p-4 mb-6 border"
        style={{
          background: "rgba(99, 102, 241, 0.1)",
          borderColor: "rgba(99, 102, 241, 0.3)",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          Only views gained after submission count toward earnings.
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Submit your post link as soon as you publish it. The earlier you submit, the more views will be counted.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
          {success}
        </div>
      )}

      {mode === "select" ? (
        <div
          className="rounded-lg border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Header: page tabs + actions */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              {loadingMedia ? (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Loading pages...</span>
              ) : (
                connections.map((conn) => (
                  <button
                    key={conn.id}
                    onClick={() => { setActiveConnection(conn.id); setSelectedPosts(new Set()); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style={{
                      background: activeConnection === conn.id ? "var(--primary)" : "transparent",
                      color: activeConnection === conn.id ? "#fff" : "var(--text-secondary)",
                      border: activeConnection === conn.id ? "none" : "1px solid var(--border)",
                    }}
                  >
                    @{conn.igUsername}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={submitSelected}
                disabled={selectedPosts.size === 0 || submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 cursor-pointer"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {submitting
                  ? "Submitting..."
                  : `Submit${selectedPosts.size > 0 ? ` (${selectedPosts.size})` : ""}`}
              </button>
              <button
                onClick={() => setMode("manual")}
                className="text-xs transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Manual &rarr;
              </button>
            </div>
          </div>

          {/* Instruction */}
          <div className="px-5 pt-4 pb-1">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Select the post{selectedPosts.size !== 1 ? "s" : ""} you want to submit!
            </p>
          </div>

          {/* Media grid */}
          <div className="p-5">
            {loadingMedia ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg animate-pulse"
                    style={{ aspectRatio: "1", background: "var(--bg-primary)" }}
                  />
                ))}
              </div>
            ) : activeMedia.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No posts found for this page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {activeMedia.map((item) => {
                  const isSelected = selectedPosts.has(item.permalink);
                  return (
                    <button
                      key={item.id}
                      onClick={() => togglePost(item.permalink)}
                      className="relative rounded-lg overflow-hidden cursor-pointer transition-all"
                      style={{
                        aspectRatio: "1",
                        border: isSelected ? "3px solid var(--primary)" : "2px solid var(--border)",
                        opacity: isSelected ? 1 : 0.85,
                      }}
                    >
                      {(item.thumbnail_url || item.media_url) ? (
                        <img
                          src={item.thumbnail_url ?? item.media_url ?? ""}
                          alt={item.caption?.slice(0, 30) ?? "Post"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: "var(--bg-primary)" }}
                        >
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {item.media_type}
                          </span>
                        </div>
                      )}

                      {/* Reels badge */}
                      {item.media_product_type === "REELS" && (
                        <div className="absolute top-1.5 left-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="drop-shadow">
                            <path d="M5 3l14 9-14 9V3z" />
                          </svg>
                        </div>
                      )}

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "var(--primary)" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}

                      {/* Hover overlay with stats */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
                        <div className="flex items-center gap-3 text-white text-xs">
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            {item.like_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {item.comments_count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ─── Manual Mode ─── */
        <div
          className="rounded-lg border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Header */}
          {connections.length > 0 && (
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Manual Submission
              </span>
              <button
                onClick={() => setMode("select")}
                className="text-xs transition-colors cursor-pointer"
                style={{ color: "var(--primary)" }}
              >
                &larr; Select from page
              </button>
            </div>
          )}

          <form onSubmit={submitManual} className="p-5 space-y-5">
            {/* Post URL */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Post URL
              </label>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
                required
                className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
                Paste the direct link to your Instagram Reel or TikTok video
              </p>
            </div>

            {/* Screenshot URL */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Screenshot URL (optional)
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://example.com/screenshot.png"
                className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !postUrl}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 cursor-pointer"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {submitting ? "Submitting..." : "Submit Post"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm border transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
