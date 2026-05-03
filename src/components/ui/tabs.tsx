"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({ items, value, onChange, className, size = "md" }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg p-1 border",
        className,
      )}
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
            )}
            style={{
              background: active ? "var(--bg-card)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: active ? "var(--shadow-card)" : undefined,
            }}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                style={{
                  background: active ? "var(--accent-bg)" : "var(--muted)",
                  color: active ? "var(--accent-foreground)" : "var(--text-muted)",
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
