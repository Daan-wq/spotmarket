import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type Cta = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-lg border",
        className,
      )}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      {icon && (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--accent-bg)", color: "var(--accent-foreground)" }}
        >
          {icon}
        </div>
      )}
      <h3
        className="text-base font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="mt-1 max-w-md text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </p>
      )}
      {(primaryCta || secondaryCta) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {primaryCta && <CtaButton cta={primaryCta} variant="default" />}
          {secondaryCta && <CtaButton cta={secondaryCta} variant="outline" />}
        </div>
      )}
    </div>
  );
}

function CtaButton({
  cta,
  variant,
}: {
  cta: Cta;
  variant: "default" | "outline";
}) {
  if (cta.href) {
    return (
      <Link href={cta.href}>
        <Button variant={variant} size="md">
          {cta.label}
        </Button>
      </Link>
    );
  }
  return (
    <Button variant={variant} size="md" onClick={cta.onClick}>
      {cta.label}
    </Button>
  );
}
