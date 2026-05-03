"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "warning" | "error" | "success";

const toneStyles: Record<AlertTone, { bg: string; text: string; border: string }> = {
  info: {
    bg: "rgba(99, 102, 241, 0.08)",
    text: "var(--accent-foreground)",
    border: "rgba(99, 102, 241, 0.25)",
  },
  warning: {
    bg: "var(--warning-bg)",
    text: "var(--warning-text)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  error: {
    bg: "var(--error-bg)",
    text: "var(--error-text)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  success: {
    bg: "var(--success-bg)",
    text: "var(--success-text)",
    border: "rgba(34, 197, 94, 0.3)",
  },
};

export interface AlertBannerProps {
  tone?: AlertTone;
  title: string;
  description?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function AlertBanner({
  tone = "info",
  title,
  description,
  cta,
  dismissible,
  onDismiss,
  className,
  icon,
}: AlertBannerProps) {
  const s = toneStyles[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        className,
      )}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-[13px] opacity-90">{description}</p>
        )}
      </div>
      {cta && (
        <div className="shrink-0 self-center">
          {cta.href ? (
            <Link
              href={cta.href}
              className="text-[13px] font-medium underline-offset-2 hover:underline"
            >
              {cta.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={cta.onClick}
              className="text-[13px] font-medium underline-offset-2 hover:underline"
            >
              {cta.label}
            </button>
          )}
        </div>
      )}
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 self-start opacity-60 hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
