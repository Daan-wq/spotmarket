import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ChecklistStatus = "complete" | "incomplete" | "blocked";

export interface ChecklistItem {
  key: string;
  label: string;
  description?: string;
  status: ChecklistStatus;
  cta?: { label: string; href: string };
}

export interface ActivationChecklistProps {
  title?: string;
  subtitle?: string;
  items: ChecklistItem[];
  className?: string;
}

export function ActivationChecklist({
  title = "Get started",
  subtitle,
  items,
  className,
}: ActivationChecklistProps) {
  const completed = items.filter((i) => i.status === "complete").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      className={cn("rounded-xl border p-5", className)}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {completed} of {total}
          </p>
          <div
            className="mt-1 h-1.5 w-24 overflow-hidden rounded-full"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </div>
      </header>

      <ul className="space-y-2">
        {items.map((item) => (
          <ChecklistRow key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const isComplete = item.status === "complete";
  const isBlocked = item.status === "blocked";
  return (
    <li
      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
      style={{
        background: isComplete ? "var(--success-bg)" : "var(--bg-secondary)",
        borderColor: isComplete
          ? "rgba(34, 197, 94, 0.25)"
          : "var(--border)",
        opacity: isBlocked ? 0.6 : 1,
      }}
    >
      <StatusDot status={item.status} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            isComplete && "line-through opacity-70",
          )}
          style={{ color: "var(--text-primary)" }}
        >
          {item.label}
        </p>
        {item.description && !isComplete && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            {item.description}
          </p>
        )}
      </div>
      {!isComplete && item.cta && (
        <Link
          href={item.cta.href}
          className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium"
          style={{
            background: "var(--accent)",
            color: "#ffffff",
          }}
        >
          {item.cta.label}
        </Link>
      )}
    </li>
  );
}

function StatusDot({ status }: { status: ChecklistStatus }) {
  if (status === "complete") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--success-text)", color: "#ffffff" }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6l2.5 2.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span
        className="h-5 w-5 shrink-0 rounded-full border"
        style={{
          borderColor: "var(--text-muted)",
          background: "transparent",
        }}
      />
    );
  }
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-full border"
      style={{
        borderColor: "var(--accent)",
        background: "var(--bg-card)",
      }}
    />
  );
}
