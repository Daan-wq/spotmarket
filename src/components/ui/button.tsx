"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "destructive" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  default:
    "bg-gradient-to-b from-neutral-800 to-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:from-neutral-700 hover:to-neutral-900 disabled:bg-neutral-400 disabled:from-neutral-400 disabled:to-neutral-400 disabled:shadow-none",
  destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:shadow-none",
  outline:
    "border border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-50 disabled:opacity-50",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isPending?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isPending = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isPending}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {isPending && (
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
