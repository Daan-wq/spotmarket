"use client";

import { useEffect, useRef } from "react";

interface CanvasPreviewProps {
  videoObjectKey: string | null;
  overlayUrl: string | null;
  position: string;
  size: string;
}

const positionMap: Record<string, { x: number; y: number }> = {
  "top-left": { x: 0.05, y: 0.05 },
  "top-center": { x: 0.5, y: 0.05 },
  "top-right": { x: 0.95, y: 0.05 },
  "middle-left": { x: 0.05, y: 0.5 },
  "middle-center": { x: 0.5, y: 0.5 },
  "middle-right": { x: 0.95, y: 0.5 },
  "bottom-left": { x: 0.05, y: 0.95 },
  "bottom-center": { x: 0.5, y: 0.95 },
  "bottom-right": { x: 0.95, y: 0.95 },
};

const sizeMap: Record<string, number> = {
  small: 0.1,
  medium: 0.2,
  large: 0.3,
};

export function CanvasPreview({
  videoObjectKey,
  overlayUrl,
  position,
  size,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!videoObjectKey || !overlayUrl || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = document.createElement("video");
    const overlay = new Image();
    let framesDrawn = 0;

    overlay.crossOrigin = "anonymous";
    video.crossOrigin = "anonymous";

    overlay.onload = () => {
      video.src = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-videos/${videoObjectKey}`;
      video.onloadeddata = () => {
        video.currentTime = 0;
        video.onseeked = () => {
          if (framesDrawn === 0) {
            drawFrame();
          }
        };
      };
    };

    overlay.onerror = () => {
      console.warn("Failed to load overlay image");
    };

    overlay.src = overlayUrl;

    const drawFrame = () => {
      framesDrawn++;
      const width = 270;
      const height = 480;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(video, 0, 0, width, height);

      const posData = positionMap[position] || { x: 0.5, y: 0.5 };
      const sizePercent = sizeMap[size] || 0.2;
      const overlayWidth = width * sizePercent;
      const overlayHeight = overlay.height * (overlayWidth / overlay.width);

      const x = posData.x === 0.5 ? width / 2 - overlayWidth / 2 : width * posData.x;
      const y = posData.y === 0.5 ? height / 2 - overlayHeight / 2 : height * posData.y;

      ctx.drawImage(overlay, x, y, overlayWidth, overlayHeight);
    };
  }, [videoObjectKey, overlayUrl, position, size]);

  return (
    <div className="mb-6">
      <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-secondary)" }}>
        Preview
      </label>
      <div
        className="rounded-lg border p-4 flex items-center justify-center"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div>
          <canvas
            ref={canvasRef}
            className="rounded border"
            style={{
              borderColor: "var(--border)",
              display: videoObjectKey && overlayUrl ? "block" : "none",
              maxWidth: "100%",
              height: "auto",
            }}
          />
          {!videoObjectKey || !overlayUrl ? (
            <div
              className="rounded flex items-center justify-center"
              style={{
                width: "270px",
                height: "480px",
                background: "var(--bg-secondary)",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              {!videoObjectKey ? "Upload video" : "Select overlay"}
            </div>
          ) : null}
          <p
            className="text-xs mt-2 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            Preview only — final render may differ slightly
          </p>
        </div>
      </div>
    </div>
  );
}
