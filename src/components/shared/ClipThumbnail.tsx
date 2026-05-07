type MediaType = "video" | "image" | "carousel";

interface Props {
  thumbnailUrl: string | null;
  mediaType: MediaType;
  caption?: string | null;
  className?: string;
  href?: string | null;
}

export default function ClipThumbnail({
  thumbnailUrl,
  mediaType,
  caption,
  className,
  href,
}: Props) {
  const inner = (
    <>
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={caption?.slice(0, 60) ?? "Post"}
          className="w-full h-full object-cover"
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
  const baseStyle = {
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default, var(--border))",
  } as const;

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
