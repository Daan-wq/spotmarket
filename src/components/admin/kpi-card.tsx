import Link from "next/link";

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: number | null;
  tone?: "default" | "warning" | "danger" | "success";
  href?: string;
}

const TONE_BG: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "var(--bg-card)",
  warning: "color-mix(in srgb, var(--warning-bg) 60%, var(--bg-card))",
  danger: "color-mix(in srgb, var(--error-bg) 60%, var(--bg-card))",
  success: "color-mix(in srgb, var(--success-bg) 60%, var(--bg-card))",
};

const TONE_BORDER: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "var(--border)",
  warning: "var(--warning-text)",
  danger: "var(--error-text)",
  success: "var(--success-text)",
};

export function KpiCard({ label, value, hint, trend, tone = "default", href }: KpiCardProps) {
  const body = (
    <div
      className="rounded-xl px-4 py-4 transition-colors h-full"
      style={{ background: TONE_BG[tone], border: `1px solid ${TONE_BORDER[tone]}` }}
    >
      <p className="text-[12px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-[26px] font-semibold mt-1 leading-tight" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
          {hint}
        </p>
      )}
      {trend != null && (
        <p
          className="text-[11px] mt-1 font-medium"
          style={{ color: trend > 0 ? "var(--success-text)" : trend < 0 ? "var(--error-text)" : "var(--text-secondary)" }}
        >
          {trend > 0 ? "▲" : trend < 0 ? "▼" : "→"} {Math.abs(trend).toFixed(1)}% vs prior
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {body}
      </Link>
    );
  }
  return body;
}
