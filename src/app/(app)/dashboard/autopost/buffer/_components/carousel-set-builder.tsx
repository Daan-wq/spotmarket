"use client";

import { useState, useEffect } from "react";

interface CarouselSetBuilderProps {
  files: File[];
  onConfirm: (groups: File[][]) => void;
  onCancel: () => void;
  uploading?: boolean;
}

export function CarouselSetBuilder({ files, onConfirm, onCancel, uploading }: CarouselSetBuilderProps) {
  const [slidesPerSet, setSlidesPerSet] = useState(5);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  const clampedSlides = Math.max(2, Math.min(10, slidesPerSet));
  const groups: File[][] = [];
  for (let i = 0; i < files.length; i += clampedSlides) {
    groups.push(files.slice(i, i + clampedSlides));
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "24px",
        width: "min(600px, 95vw)",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 600, margin: 0 }}>
            Build Carousel Sets
          </h3>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
          {files.length} image{files.length !== 1 ? "s" : ""} selected.
          Each carousel post will use {clampedSlides} slides.
          This creates {groups.length} carousel post{groups.length !== 1 ? "s" : ""}.
        </p>

        {/* Slides per set control */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Slides per carousel:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setSlidesPerSet((n) => Math.max(2, n - 1))}
              style={{ width: 28, height: 28, borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "16px" }}
            >−</button>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", minWidth: 20, textAlign: "center" }}>{clampedSlides}</span>
            <button
              onClick={() => setSlidesPerSet((n) => Math.min(10, n + 1))}
              style={{ width: 28, height: 28, borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "16px" }}
            >+</button>
          </div>
        </div>

        {/* Groups preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {groups.map((group, gi) => {
            const startIdx = gi * clampedSlides;
            return (
              <div key={gi} style={{
                padding: "10px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
              }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Carousel {gi + 1} · {group.length} slide{group.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {group.map((_, fi) => {
                    const previewUrl = previews[startIdx + fi];
                    return (
                      <div
                        key={fi}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "4px",
                          background: previewUrl ? `url(${previewUrl}) center/cover` : "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        <span style={{
                          position: "absolute",
                          bottom: 2,
                          right: 3,
                          fontSize: "9px",
                          color: "#fff",
                          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                        }}>{fi + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onConfirm(groups)}
            disabled={uploading}
            style={{
              flex: 1,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "10px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading
              ? "Uploading..."
              : `Confirm ${groups.length} set${groups.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={onCancel}
            disabled={uploading}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "10px 16px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
