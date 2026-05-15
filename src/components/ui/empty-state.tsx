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
        "flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700"
        >
          {icon}
        </div>
      )}
      <h3
        className="text-base font-semibold text-neutral-950"
      >
        {title}
      </h3>
      {description && (
        <p
          className="mt-2 max-w-md text-sm text-neutral-500"
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
