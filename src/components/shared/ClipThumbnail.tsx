type MediaType = "video" | "image" | "carousel";

interface Props {
  thumbnailUrl: string | null;
  mediaType: MediaType;
  caption?: string | null;
  className?: string;
}

export default function ClipThumbnail({
  thumbnailUrl,
  mediaType,
  caption,
  className,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default, var(--border))" }}
    >
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
        <div className="absolute top-1.5 left-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="drop-shadow">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
      )}
    </div>
  );
}
