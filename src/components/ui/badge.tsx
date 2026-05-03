import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "active"
  | "paused"
  | "private"
  | "verified"
  | "pending"
  | "failed"
  | "paid"
  | "unpaid"
  | "ending-soon"
  | "new"
  | "recommended"
  | "eligible"
  | "ineligible"
  | "neutral";

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string; border?: string }
> = {
  active: { bg: "var(--success-bg)", text: "var(--success-text)" },
  paused: { bg: "var(--muted)", text: "var(--text-secondary)" },
  private: { bg: "rgba(99, 102, 241, 0.12)", text: "var(--accent-foreground)" },
  verified: { bg: "var(--success-bg)", text: "var(--success-text)" },
  pending: { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  failed: { bg: "var(--error-bg)", text: "var(--error-text)" },
  paid: { bg: "var(--success-bg)", text: "var(--success-text)" },
  unpaid: { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  "ending-soon": { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  new: { bg: "rgba(59, 130, 246, 0.12)", text: "#1d4ed8" },
  recommended: {
    bg: "rgba(99, 102, 241, 0.12)",
    text: "var(--accent-foreground)",
  },
  eligible: { bg: "var(--success-bg)", text: "var(--success-text)" },
  ineligible: { bg: "var(--muted)", text: "var(--text-muted)" },
  neutral: { bg: "var(--muted)", text: "var(--text-secondary)" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        className,
      )}
      style={{
        background: s.bg,
        color: s.text,
        border: s.border ? `1px solid ${s.border}` : undefined,
      }}
      {...props}
    >
      {icon && <span className="inline-flex h-3 w-3 items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
