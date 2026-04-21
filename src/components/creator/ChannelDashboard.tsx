import Link from "next/link";
import type { ReactNode } from "react";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}

export function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-5 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export function DashboardSection({
  title,
  rightSlot,
  children,
}: {
  title?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-6 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {(title || rightSlot) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
          )}
          {rightSlot}
        </div>
      )}
      {children}
    </div>
  );
}

export function BackToPages() {
  return (
    <div>
      <Link
        href="/creator/pages"
        className="text-sm inline-flex items-center gap-1 mb-3 transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Pages
      </Link>
    </div>
  );
}

export function formatCompact(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}
