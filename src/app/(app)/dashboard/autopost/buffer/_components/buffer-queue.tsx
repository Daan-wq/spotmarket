"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { detectContentType, type ContentTypeName } from "@/lib/detect-content-type";
import { CarouselSetBuilder } from "./carousel-set-builder";

const COLOR_PRESETS = [
  "#7c3aed", // purple
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
];

interface Collection {
  id: string;
  name: string;
  color: string;
  queuedCount: number;
}

interface BufferItem {
  id: string;
  contentType: string;
  r2Keys: string[];
  thumbnailUrl: string | null;
  filename: string;
  sortOrder: number;
  status: string;
  createdAt: string;
}

export function BufferQueue() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [items, setItems] = useState<BufferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/collections");
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections || []);
          if (data.collections?.length > 0) {
            setSelectedCollectionId(data.collections[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch collections:", err);
      }
      setLoading(false);
    };
    fetchCollections();
  }, []);

  // Fetch items when collection changes
  useEffect(() => {
    if (!selectedCollectionId) return;

    const fetchItems = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/buffer/list/${selectedCollectionId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch items:", err);
      }
      setLoading(false);
    };
    fetchItems();
  }, [selectedCollectionId]);

  const handleCreateCollection = useCallback(async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, color: newColor }),
      });

      if (res.ok) {
        const data = await res.json();
        setCollections([...collections, data.collection]);
        setSelectedCollectionId(data.collection.id);
        setNewName("");
        setNewColor(COLOR_PRESETS[0]);
        setShowNewForm(false);
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  }, [newName, newColor, collections]);

  const handleSkip = useCallback(
    async (id: string) => {
      await fetch(`/api/buffer/${id}/skip`, { method: "PATCH" });
      if (selectedCollectionId) {
        const res = await fetch(`/api/buffer/list/${selectedCollectionId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      }
    },
    [selectedCollectionId]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this item?")) return;
      await fetch(`/api/buffer/${id}`, { method: "DELETE" });
      if (selectedCollectionId) {
        const res = await fetch(`/api/buffer/list/${selectedCollectionId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      }
    },
    [selectedCollectionId]
  );

  const uploadSingleFile = useCallback(
    async (file: File, contentType: ContentTypeName) => {
      if (!selectedCollectionId) return;

      const urlRes = await fetch("/api/buffer/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: selectedCollectionId,
          fileName: file.name,
          fileMimeType: file.type,
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, r2Key } = await urlRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await fetch("/api/buffer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: selectedCollectionId,
          contentType,
          r2Key,
          filename: file.name,
          syncSource: "manual_upload",
        }),
      });
    },
    [selectedCollectionId]
  );

  const handleFilesSelected = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      // Multiple images → carousel builder
      const allImages = files.every((f) => f.type.startsWith("image/"));
      if (files.length > 1 && allImages) {
        setStagedFiles(files);
        setShowCarouselBuilder(true);
        return;
      }

      // Single file: auto-detect and upload
      if (files.length === 1) {
        try {
          const detected = await detectContentType(files[0], 1);
          await uploadSingleFile(files[0], detected);
          if (selectedCollectionId) {
            const res = await fetch(`/api/buffer/list/${selectedCollectionId}`);
            if (res.ok) {
              const data = await res.json();
              setItems(data.items || []);
            }
          }
        } catch (err) {
          console.error("Upload failed:", err);
        }
        return;
      }

      // Multiple mixed files: upload each to detected type
      for (const file of files) {
        try {
          const detected = await detectContentType(file, 1);
          await uploadSingleFile(file, detected);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
      if (selectedCollectionId) {
        const res = await fetch(`/api/buffer/list/${selectedCollectionId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      }
    },
    [selectedCollectionId, uploadSingleFile]
  );

  const handleCarouselConfirm = useCallback(
    async (groups: File[][]) => {
      if (!selectedCollectionId) return;
      setUploadingCarousel(true);
      try {
        for (const group of groups) {
          const r2Keys: string[] = [];
          for (const file of group) {
            const urlRes = await fetch("/api/buffer/upload-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                collectionId: selectedCollectionId,
                fileName: file.name,
                fileMimeType: file.type,
              }),
            });
            if (!urlRes.ok) continue;
            const { uploadUrl, r2Key } = await urlRes.json();
            await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type },
            });
            r2Keys.push(r2Key);
          }
          if (r2Keys.length > 0) {
            await fetch("/api/buffer/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                collectionId: selectedCollectionId,
                contentType: "CAROUSEL",
                r2Keys,
                syncSource: "manual_upload",
              }),
            });
          }
        }
        setStagedFiles([]);
        setShowCarouselBuilder(false);
        const res = await fetch(`/api/buffer/list/${selectedCollectionId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (err) {
        console.error("Carousel upload failed:", err);
      }
      setUploadingCarousel(false);
    },
    [selectedCollectionId]
  );

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg-primary)" }}>
      {/* Left sidebar */}
      <div
        style={{
          width: "200px",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {/* Collections list */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setSelectedCollectionId(collection.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                marginBottom: "6px",
                borderRadius: "6px",
                border:
                  selectedCollectionId === collection.id
                    ? "2px solid var(--accent)"
                    : "1px solid transparent",
                background:
                  selectedCollectionId === collection.id
                    ? "var(--bg-secondary)"
                    : "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: collection.color,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  fontSize: "12px",
                  color:
                    selectedCollectionId === collection.id
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {collection.name}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  background: "var(--bg-card)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {collection.queuedCount}
              </div>
            </button>
          ))}
        </div>

        {/* New collection button */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--accent)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              + New Collection
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="text"
                placeholder="Collection name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCollection();
                  if (e.key === "Escape") {
                    setShowNewForm(false);
                    setNewName("");
                  }
                }}
                style={{
                  padding: "6px",
                  fontSize: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "3px",
                      background: color,
                      border: newColor === color ? "2px solid var(--text-primary)" : "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={handleCreateCollection}
                  style={{
                    flex: 1,
                    padding: "6px",
                    fontSize: "11px",
                    fontWeight: 500,
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewName("");
                  }}
                  style={{
                    flex: 1,
                    padding: "6px",
                    fontSize: "11px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {showCarouselBuilder && (
          <CarouselSetBuilder
            files={stagedFiles}
            onConfirm={handleCarouselConfirm}
            onCancel={() => {
              setShowCarouselBuilder(false);
              setStagedFiles([]);
            }}
            uploading={uploadingCarousel}
          />
        )}

        {!selectedCollectionId ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "14px",
            }}
          >
            Select or create a collection
          </div>
        ) : (
          <>
            {/* Items list */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  Loading...
                </p>
              ) : items.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    textAlign: "center",
                    paddingTop: "40px",
                  }}
                >
                  No items in this collection. Upload content below.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {items.map((item) => (
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
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "4px",
                          background: item.thumbnailUrl
                            ? `url(${item.thumbnailUrl}) center/cover`
                            : "var(--bg-secondary)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.filename}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          #{item.sortOrder + 1} · {item.contentType}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSkip(item.id)}
                        style={{
                          background: "none",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload button */}
            <div style={{ padding: "20px", borderTop: "1px solid var(--border)" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleFilesSelected(files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Upload Content
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
