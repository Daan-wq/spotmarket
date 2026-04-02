"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VideoUploadData {
  id: string;
  fileName: string;
  fileSize: number;
  duration: number | null;
  status: string;
  storagePath: string;
  createdAt: string;
}

interface VideoUploadReviewProps {
  upload: VideoUploadData;
  previewUrl: string | null;
  campaignId: string;
  applicationId: string;
}

export function VideoUploadReview({
  upload,
  previewUrl,
  campaignId,
  applicationId,
}: VideoUploadReviewProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approve" | "decline") {
    setLoading(true);
    // For video uploads, we use the post review endpoint if a post exists,
    // or just update the upload status directly
    const res = await fetch(
      `/api/campaigns/${campaignId}/applications/${applicationId}/uploads/${upload.id}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      }
    );
    setLoading(false);

    if (res.ok) {
      setComment("");
      router.refresh();
    }
  }

  const isPending = upload.status === "ready";

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      {/* Video preview */}
      {previewUrl ? (
        <video
          src={previewUrl}
          controls
          className="w-full rounded-lg mb-3 max-h-80 object-contain"
          style={{ background: "#000" }}
        />
      ) : (
        <div
          className="w-full rounded-lg mb-3 flex items-center justify-center h-40"
          style={{ background: "var(--muted)" }}
        >
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Preview unavailable</span>
        </div>
      )}

      {/* Metadata */}
      <div className="flex gap-4 text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        <span>{upload.fileName}</span>
        <span>{(upload.fileSize / 1024 / 1024).toFixed(1)} MB</span>
        {upload.duration && <span>{upload.duration}s</span>}
        <span className="capitalize">{upload.status}</span>
      </div>

      {/* Brand actions */}
      {isPending && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Feedback (optional)..."
            rows={2}
            className="w-full px-3 py-2 mb-3 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: "var(--muted)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("approve")}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 cursor-pointer"
              style={{ background: "#15803d" }}
            >
              {loading ? "..." : "Approve Video"}
            </button>
            <button
              onClick={() => handleAction("decline")}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 cursor-pointer"
              style={{ background: "#fef2f2", color: "#b91c1c" }}
            >
              Request Changes
            </button>
          </div>
        </>
      )}
    </div>
  );
}
