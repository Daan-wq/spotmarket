"use client";

interface Props {
  pageIndex: number;
  hasMore: boolean;
  isLoading: boolean;
  isRateLimited: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function PaginationControls({
  pageIndex,
  hasMore,
  isLoading,
  isRateLimited,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="flex items-center justify-between pt-3">
      <button
        onClick={onPrev}
        disabled={pageIndex === 0 || isLoading}
        className="px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        ← Prev
      </button>

      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Page {pageIndex + 1}
      </span>

      <button
        onClick={onNext}
        disabled={!hasMore || isLoading || isRateLimited}
        className="px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        Next →
      </button>
    </div>
  );
}
