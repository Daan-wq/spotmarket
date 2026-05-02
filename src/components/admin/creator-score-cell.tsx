interface CreatorScoreCellProps {
  score: number | null | undefined;
  sampleSize?: number | null;
}

function band(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Excellent", color: "var(--success-text)", bg: "var(--success-bg)" };
  if (score >= 60) return { label: "Strong", color: "var(--success-text)", bg: "var(--success-bg)" };
  if (score >= 40) return { label: "Average", color: "var(--warning-text)", bg: "var(--warning-bg)" };
  if (score >= 20) return { label: "Weak", color: "var(--warning-text)", bg: "var(--warning-bg)" };
  return { label: "Poor", color: "var(--error-text)", bg: "var(--error-bg)" };
}

export function CreatorScoreCell({ score, sampleSize }: CreatorScoreCellProps) {
  if (score == null) {
    return (
      <span className="text-xs" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
        — no score
      </span>
    );
  }
  const b = band(score);
  return (
    <div className="flex items-center gap-2">
      <span
        className="px-2 py-0.5 rounded text-xs font-semibold tabular-nums"
        style={{ background: b.bg, color: b.color }}
      >
        {Math.round(score)}
      </span>
      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        {b.label}
        {sampleSize != null && sampleSize > 0 ? ` · n=${sampleSize}` : ""}
      </span>
    </div>
  );
}
