"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "./button";
import { Drawer } from "./drawer";
import { cn } from "@/lib/cn";

interface ProgressiveActionDrawerProps {
  triggerLabel: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  badgeLabel?: string;
  width?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function ProgressiveActionDrawer({
  triggerLabel,
  title,
  description,
  children,
  footer,
  badgeLabel,
  width = "md",
  variant = "default",
  size = "md",
  className,
  showIcon = true,
}: ProgressiveActionDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn("shrink-0", className)}
      >
        {showIcon ? <SlidersHorizontal className="h-4 w-4" /> : null}
        <span>{triggerLabel}</span>
        {badgeLabel ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] leading-none",
              variant === "default" ? "bg-white/20" : "bg-neutral-100 text-neutral-700",
            )}
          >
            {badgeLabel}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 opacity-70" />
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        footer={footer}
        width={width}
      >
        {children}
      </Drawer>
    </>
  );
}
