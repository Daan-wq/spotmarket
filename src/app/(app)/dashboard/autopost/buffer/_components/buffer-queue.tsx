"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { detectContentType, type ContentTypeName } from "@/lib/detect-content-type";
import { CarouselSetBuilder } from "./carousel-set-builder";

const CONTENT_TYPES = ["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"];
const CONTENT_COLORS: Record<string, string> = {
  REEL: "#7c3aed", FEED_VIDEO: "#3b82f6", FEED_PHOTO: "#22c55e",
  STORY_VIDEO: "#f59e0b", STORY_PHOTO: "#ef4444", CAROUSEL: "#ec4899",
};

interface IgAccount { id: string; platformUsername: string }
interface BufferItem {
  id: string;
  contentType: string;
  r2Keys: string[];
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
  status: string;
  localPath: string | null;
  createdAt: string;
}

interface CoverageEntry { contentType: string; queued: number }

export function BufferQueue({ igAccounts }: { igAccounts: IgAccount[] }) {
  const [selectedAccount, setSelectedAccount] = useState(igAccounts[0]?.id || "");
  const [activeType, setActiveType] = useState("REEL");
  const [items, setItems] = useState<BufferItem[]>([]);
  const [coverage, setCoverage] = useState<CoverageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);
  const [autoDetectHint, setAutoDetectHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBuffer = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/buffer/list/${selectedAccount}?contentType=${activeType}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setCoverage(data.coverage || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedAccount, activeType]);

  useEffect(() => { fetchBuffer(); }, [fetchBuffer]);

  const handleSkip = async (id: string) => {
    await fetch(`/api/buffer/${id}/skip`, { method: "PATCH" });
    fetchBuffer();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/buffer/${id}`, { method: "DELETE" });
    fetchBuffer();
  };

  const uploadSingleFile = useCallback(async (file: File, contentType: ContentTypeName) => {
    const urlRes = await fetch("/api/buffer/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        igAccountId: selectedAccount,
        contentType,
        fileName: file.name,
        fileMimeType: file.type,
      }),
    });
    if (!urlRes.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, objectKey } = await urlRes.json();

    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

    await fetch("/api/buffer/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        igAccountId: selectedAccount,
        contentType,
        r2Keys: [objectKey],
        syncSource: "manual_upload",
      }),
    });
  }, [selectedAccount]);

  const handleFilesSelected = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // CAROUSEL tab: always stage for set grouping
    if (activeType === "CAROUSEL") {
      setStagedFiles(files);
      setShowCarouselBuilder(true);
      return;
    }

    // Multiple images on a non-carousel tab → suggest carousel
    const allImages = files.every((f) => f.type.startsWith("image/"));
    if (files.length > 1 && allImages && activeType !== "CAROUSEL") {
      setStagedFiles(files);
      setActiveType("CAROUSEL");
      setShowCarouselBuilder(true);
      return;
    }

    // Single file: auto-detect and switch tab if needed
    if (files.length === 1) {
      const detected = await detectContentType(files[0], 1);
      if (detected !== activeType) {
        setActiveType(detected);
        setAutoDetectHint(`Auto-detected as ${detected.replace("_", " ")} — switched tab`);
        setTimeout(() => setAutoDetectHint(null), 3000);
      }
      try {
        await uploadSingleFile(files[0], detected);
        fetchBuffer();
      } catch (err) {
        console.error("Upload failed:", err);
      }
      return;
    }

    // Multiple files of mixed types on non-carousel tab: upload each to detected type
    for (const file of files) {
      try {
        const detected = await detectContentType(file, 1);
        await uploadSingleFile(file, detected);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    fetchBuffer();
  }, [activeType, uploadSingleFile, fetchBuffer]);

  const handleCarouselConfirm = useCallback(async (groups: File[][]) => {
    setUploadingCarousel(true);
    try {
      for (const group of groups) {
        const r2Keys: string[] = [];
        for (const file of group) {
          const urlRes = await fetch("/api/buffer/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              igAccountId: selectedAccount,
              contentType: "CAROUSEL",
              fileName: file.name,
              fileMimeType: file.type,
            }),
          });
          if (!urlRes.ok) continue;
          const { uploadUrl, objectKey } = await urlRes.json();
          await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          r2Keys.push(objectKey);
        }
        if (r2Keys.length > 0) {
          await fetch("/api/buffer/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              igAccountId: selectedAccount,
              contentType: "CAROUSEL",
              r2Keys,
              syncSource: "manual_upload",
            }),
          });
        }
      }
      setStagedFiles([]);
      setShowCarouselBuilder(false);
      fetchBuffer();
    } catch (err) {
      console.error("Carousel upload failed:", err);
    }
    setUploadingCarousel(false);
  }, [selectedAccount, fetchBuffer]);

  const queuedCount = coverage.find(c => c.contentType === activeType)?.queued ?? 0;

  return (
    <div style={{ padding: "20px" }}>
      {showCarouselBuilder && (
        <CarouselSetBuilder
          files={stagedFiles}
          onConfirm={handleCarouselConfirm}
          onCancel={() => { setShowCarouselBuilder(false); setStagedFiles([]); }}
          uploading={uploadingCarousel}
        />
      )}

      {autoDetectHint && (
        <div style={{
          padding: "8px 14px",
          background: "rgba(59,130,246,0.1)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#3b82f6",
          marginBottom: "12px",
        }}>
          {autoDetectHint}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 600 }}>Posting Storage</h2>
        <select
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px" }}
        >
          {igAccounts.map(a => <option key={a.id} value={a.id}>@{a.platformUsername}</option>)}
        </select>
      </div>

      {/* Content type tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
        {CONTENT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: activeType === type ? CONTENT_COLORS[type] : "var(--bg-secondary)",
              color: activeType === type ? "#fff" : "var(--text-secondary)",
            }}
          >
            {type.replace("_", " ")}
            {coverage.find(c => c.contentType === type) && (
              <span style={{ marginLeft: "4px", opacity: 0.7 }}>
                ({coverage.find(c => c.contentType === type)?.queued || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Coverage estimate */}
      <div style={{
        padding: "10px 14px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        marginBottom: "16px",
        fontSize: "13px",
        color: "var(--text-secondary)",
      }}>
        {queuedCount} queued · ~{Math.ceil(queuedCount / 3 * 7)} days coverage at 3/week
      </div>

      {/* Items list */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
          No items in storage. Upload content below or connect a folder in Settings to sync automatically.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "4px",
                background: item.thumbnailUrl ? `url(${item.thumbnailUrl}) center/cover` : "var(--bg-secondary)",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.localPath?.split("/").pop() || item.r2Keys[0]?.split("/").pop() || "Untitled"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  #{item.sortOrder + 1} · {item.status}
                </div>
              </div>
              <button onClick={() => handleSkip(item.id)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer" }}>Skip</button>
              <button onClick={() => handleDelete(item.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "#ef4444", cursor: "pointer" }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        style={{ display: "none" }}
        onChange={e => {
          const files = e.target.files;
          if (files && files.length > 0) handleFilesSelected(files);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginTop: "12px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "10px",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          width: "100%",
        }}
      >
        Upload Content
      </button>
    </div>
  );
}
