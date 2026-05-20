"use client";

import { useState } from "react";

type MediaType = "video" | "image" | "carousel";

interface Props {
  thumbnailUrl: string | null;
  mediaType: MediaType;
  caption?: string | null;
  className?: string;
  href?: string | null;
  /**
   * When true, the container's aspect ratio is driven by the image's natural
   * dimensions (read on load). Until the image loads, falls back to
   * `initialAspectRatio` (or a mediaType-derived default). The image uses
   * `object-contain` so the brief pre-load state never crops.
   *
   * When false (default), the parent owns sizing via classes like `h-10 w-10`
   * or `aspect-square`, and the image keeps `object-cover`.
   */
  dynamicAspectRatio?: boolean;
  /** Initial aspect ratio (width / height) used before image loads. */
  initialAspectRatio?: number;
}

function defaultRatioForMediaType(mediaType: MediaType): number {
  if (mediaType === "video") return 9 / 16;
  if (mediaType === "carousel") return 1;
  return 4 / 5;
}

export default function ClipThumbnail({
  thumbnailUrl,
  mediaType,
  caption,
  className,
  href,
  dynamicAspectRatio = false,
  initialAspectRatio,
}: Props) {
  const [aspectRatio, setAspectRatio] = useState<number>(
    initialAspectRatio ?? defaultRatioForMediaType(mediaType),
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const imgClass = dynamicAspectRatio
    ? "w-full h-full object-contain"
    : "w-full h-full object-cover";
  const showImage = Boolean(thumbnailUrl && failedSrc !== thumbnailUrl);

  const inner = (
    <>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl ?? undefined}
          alt={caption?.slice(0, 60) ?? "Post"}
          className={imgClass}
          onLoad={
            dynamicAspectRatio
              ? (e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight) {
                    setAspectRatio(naturalWidth / naturalHeight);
                  }
                }
              : undefined
          }
          onError={() => setFailedSrc(thumbnailUrl)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "var(--bg-primary)" }}
        >
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {mediaType}
          </span>
        </div>
      )}

      {mediaType === "video" && (
        <>
          {/* Small corner play indicator (always visible) */}
          <div className="absolute top-2 left-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="drop-shadow">
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          </div>

          {/* Centered hover overlay (only when interactive) */}
          {href && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
              <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#09090b" style={{ marginLeft: 2 }}>
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  const baseClass = `relative overflow-hidden ${className ?? ""}`;
  const baseStyle: React.CSSProperties = {
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default, var(--border))",
    ...(dynamicAspectRatio ? { aspectRatio } : {}),
  };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block ${baseClass}`}
        style={baseStyle}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={baseClass} style={baseStyle}>
      {inner}
    </div>
  );
}
