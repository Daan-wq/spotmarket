"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
  igMediaCache?: unknown;
}

interface CachedMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_product_type?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  thumbnail_url?: string;
}

type Tab = "url" | "upload" | "cached";

export function SubmitPostForm({
  campaignId,
  applicationId,
  socialAccounts,
}: {
  campaignId: string;
  applicationId: string;
  socialAccounts: SocialAccount[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cached");
  const [socialAccountId, setSocialAccountId] = useState(socialAccounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // URL tab state
  const [postUrl, setPostUrl] = useState("");

  // Upload tab state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Cached tab state
  const [selectedMedia, setSelectedMedia] = useState<CachedMedia | null>(null);

  const selectedAccount = socialAccounts.find((a) => a.id === socialAccountId);
  const cachedMedia = getCachedVideoMedia(selectedAccount?.igMediaCache);

  function getCachedVideoMedia(cache: unknown): CachedMedia[] {
    if (!Array.isArray(cache)) return [];
    return cache as CachedMedia[];
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch(
      `/api/campaigns/${campaignId}/applications/${applicationId}/posts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl, socialAccountId }),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    setPostUrl("");
    setSuccess("Post submitted successfully!");
    router.refresh();
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    setUploadProgress("Uploading...");

    const formData = new FormData();
    formData.append("file", uploadFile);

    const res = await fetch(
      `/api/campaigns/${campaignId}/applications/${applicationId}/uploads`,
      { method: "POST", body: formData }
    );

    const data = await res.json();
    setLoading(false);
    setUploadProgress(null);

    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }

    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSuccess("Video uploaded! The brand will review it before you post to Instagram.");
    router.refresh();
  }

  async function handleCachedSelect() {
    if (!selectedMedia) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Extract post ID from permalink
    const platformPostId = extractPostId(selectedMedia.permalink) || selectedMedia.id;

    const res = await fetch(
      `/api/campaigns/${campaignId}/applications/${applicationId}/select-media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialAccountId,
          mediaId: selectedMedia.id,
          postUrl: selectedMedia.permalink,
          platformPostId,
        }),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    setSelectedMedia(null);
    setSuccess("Post submitted for review!");
    router.refresh();
  }

  function extractPostId(permalink: string): string | null {
    const match = permalink.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  const tabs: { key: Tab; label: string; description: string }[] = [
    { key: "cached", label: "Select Post", description: "Choose from your recent posts & reels" },
    { key: "url", label: "Paste URL", description: "Submit an Instagram post link" },
    { key: "upload", label: "Upload Video", description: "Upload for brand pre-approval" },
  ];

  return (
    <div className="space-y-4">
      {/* Account selector */}
      {socialAccounts.length > 1 && (
        <select
          value={socialAccountId}
          onChange={(e) => { setSocialAccountId(e.target.value); setSelectedMedia(null); }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {socialAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              @{a.platformUsername} ({a.platform})
            </option>
          ))}
        </select>
      )}

      {/* Tab selector */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(null); setSuccess(null); }}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === t.key ? "text-white" : ""
            }`}
            style={{
              background: tab === t.key ? "var(--text-primary)" : "transparent",
              color: tab === t.key ? "white" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {tabs.find((t) => t.key === tab)?.description}
      </p>

      {/* URL Tab */}
      {tab === "url" && (
        <form onSubmit={handleUrlSubmit} className="space-y-3">
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !postUrl}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? "Submitting..." : "Submit Post"}
          </button>
        </form>
      )}

      {/* Upload Tab */}
      {tab === "upload" && (
        <div className="space-y-3">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-indigo-400"
            style={{ borderColor: "var(--border)" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            {uploadFile ? (
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {uploadFile.name}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Click or drag to upload video
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  MP4 or MOV, max 100MB
                </p>
              </div>
            )}
          </div>

          {uploadProgress && (
            <p className="text-xs text-indigo-600 animate-pulse">{uploadProgress}</p>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !uploadFile}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? "Uploading..." : "Upload for Review"}
          </button>
        </div>
      )}

      {/* Cached Media Tab */}
      {tab === "cached" && (
        <div className="space-y-3">
          {cachedMedia.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
              No recent posts found. Try syncing your Instagram account.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {cachedMedia.map((media) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedMedia(media.id === selectedMedia?.id ? null : media)}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedMedia?.id === media.id ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                    }`}
                    style={{ aspectRatio: "9/16" }}
                  >
                    {media.thumbnail_url ? (
                      <img
                        src={media.thumbnail_url}
                        alt={media.caption?.slice(0, 50) ?? "Video"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Video</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                      <p className="text-xs text-white truncate">{media.caption?.slice(0, 30) ?? "No caption"}</p>
                      {media.like_count !== undefined && (
                        <p className="text-xs text-white/70">{media.like_count} likes</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedMedia && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--muted)", color: "var(--text-secondary)" }}>
                  Selected: {selectedMedia.caption?.slice(0, 80) ?? selectedMedia.permalink}
                </div>
              )}

              <button
                onClick={handleCachedSelect}
                disabled={loading || !selectedMedia}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? "Submitting..." : "Submit Selected Post"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Status messages */}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}
    </div>
  );
}
