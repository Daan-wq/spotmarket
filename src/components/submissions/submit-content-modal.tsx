"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

interface SubmitContentModalProps {
  campaignId: string;
  applicationId: string;
  campaignName: string;
  onClose: () => void;
}

const VALID_URL_PATTERNS = [
  /instagram\.com\/(reel|p)\//,
  /tiktok\.com\/@[\w.]+\/video\//,
  /youtube\.com\/watch/,
  /youtu\.be\//,
  /youtube\.com\/shorts\//,
  /x\.com\/\w+\/status\//,
  /twitter\.com\/\w+\/status\//,
];

export function SubmitContentModal({
  campaignId,
  applicationId,
  campaignName,
  onClose,
}: SubmitContentModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postUrl, setPostUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [sendMessage, setSendMessage] = useState(false);
  const [brandMessage, setBrandMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const isValidUrl = useCallback((url: string) => {
    if (!url.trim()) return true; // empty is okay (not required if video uploaded)
    return VALID_URL_PATTERNS.some((pattern) => pattern.test(url));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!postUrl.trim() && !videoFile) {
      setError("Please provide a social media post URL or upload a video.");
      return;
    }

    if (postUrl.trim() && !isValidUrl(postUrl)) {
      setError("Invalid social media link format. Use Instagram, TikTok, YouTube, or X links.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check for duplicate
      if (postUrl.trim()) {
        const checkRes = await fetch(
          `/api/submissions/check-duplicate?campaignId=${campaignId}&postUrl=${encodeURIComponent(postUrl)}`
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.isDuplicate && !duplicateWarning) {
            setDuplicateWarning(true);
            setLoading(false);
            return;
          }
        }
      }

      const formData = new FormData();
      formData.append("applicationId", applicationId);
      formData.append("campaignId", campaignId);
      if (postUrl.trim()) formData.append("postUrl", postUrl.trim());
      if (videoFile) formData.append("video", videoFile);
      if (sendMessage && brandMessage.trim()) formData.append("brandMessage", brandMessage.trim());
      formData.append("claimedViews", "0");

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit content");
        return;
      }

      startTransition(() => router.refresh());
      onClose();
    } catch {
      setError("An error occurred while submitting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md cursor-pointer"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold mb-5" style={{ color: "var(--text-primary)" }}>
          Submit Content
        </h2>

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div className="mb-4 p-4 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
              <span className="font-semibold text-sm" style={{ color: "#1e40af" }}>Video Already Submitted</span>
            </div>
            <p className="text-sm mb-2" style={{ color: "#1e40af" }}>
              We already have this video recorded. Would you like to resubmit it to refresh your metrics?
            </p>
            <p className="text-xs mb-3" style={{ color: "#DC2626" }}>
              This will reset your review status to pending for brand re-approval.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDuplicateWarning(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{ background: "#F59E0B" }}
              >
                Yes, Resubmit
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: "var(--error-bg)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" style={{ color: "var(--error)" }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--error-text)" }}>Submission Error</p>
              <p className="text-sm" style={{ color: "var(--error-text)" }}>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto shrink-0 cursor-pointer" style={{ color: "var(--error-text)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
        )}

        {/* Social media post URL */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-primary)" }}>
            Social media post <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            type="url"
            placeholder="https://www.instagram.com/reel/234567890"
            value={postUrl}
            onChange={(e) => { setPostUrl(e.target.value); setDuplicateWarning(false); }}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-primary)",
              border: `1px solid ${postUrl && !isValidUrl(postUrl) ? "var(--error)" : "var(--border-default)"}`,
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Video Upload */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-primary)" }}>
            Video Upload
          </label>
          <div
            className="relative rounded-lg p-8 text-center cursor-pointer transition-colors"
            style={{
              border: `2px dashed ${dragActive ? "var(--primary)" : "var(--border-default)"}`,
              background: dragActive ? "var(--accent-bg)" : "var(--bg-primary)",
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {videoFile ? (
              <div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2" style={{ color: "var(--success)" }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{videoFile.name}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2" style={{ color: "var(--text-muted)" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>Click or drag video here</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  MP4, MOV, AVI, MKV, WebM &bull; Max 2GB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Send message toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => setSendMessage(!sendMessage)}
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              style={{
                background: sendMessage ? "#14b8a6" : "transparent",
                border: sendMessage ? "none" : "2px solid var(--border-default)",
              }}
            >
              {sendMessage && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Send a message to the brand
            </span>
          </label>
          {sendMessage && (
            <textarea
              placeholder="Ask a question or share something about your submission..."
              value={brandMessage}
              onChange={(e) => setBrandMessage(e.target.value)}
              rows={3}
              className="w-full mt-2 px-3 py-2.5 rounded-lg text-sm outline-none resize-y"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
          }}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
