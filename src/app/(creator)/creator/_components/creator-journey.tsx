"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type JourneyStatus = "complete" | "current" | "blocked" | "idle" | "attention";

export interface JourneyStepItem {
  id: string;
  label: string;
  description: string;
  status: JourneyStatus;
  meta?: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
  };
}

const statusCopy: Record<JourneyStatus, string> = {
  complete: "Done",
  current: "Now",
  blocked: "Locked",
  idle: "Next",
  attention: "Review",
};

const statusClasses: Record<JourneyStatus, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  current: "border-neutral-950 bg-neutral-950 text-white",
  blocked: "border-neutral-200 bg-neutral-100 text-neutral-400",
  idle: "border-neutral-200 bg-white text-neutral-600",
  attention: "border-orange-200 bg-orange-50 text-orange-700",
};

export function CreatorPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[32px] font-semibold leading-tight tracking-normal text-neutral-950 md:text-[36px]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function CreatorJourney({
  eyebrow = "Workflow",
  title,
  description,
  steps,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  steps: JourneyStepItem[];
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-neutral-200 bg-white p-5 md:p-6", className)}>
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {eyebrow}
        </p>
        <h2 className="text-lg font-semibold tracking-normal text-neutral-950">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-neutral-500">
          {description}
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <JourneyStep key={step.id} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </ol>
    </section>
  );
}

function JourneyStep({
  step,
  index,
  isLast,
}: {
  step: JourneyStepItem;
  index: number;
  isLast: boolean;
}) {
  const isBlocked = step.status === "blocked";
  const isActive = step.status === "current" || step.status === "attention";

  return (
    <li className="relative grid grid-cols-[40px_1fr] gap-4">
      {!isLast ? (
        <span className="absolute left-5 top-11 h-[calc(100%-18px)] w-px bg-neutral-200" aria-hidden />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
          statusClasses[step.status],
        )}
      >
        {step.status === "complete" ? <CheckIcon /> : index + 1}
      </div>

      <div
        className={cn(
          "rounded-2xl border p-4 transition-colors",
          isActive ? "border-neutral-300 bg-neutral-50" : "border-neutral-200 bg-white",
          isBlocked && "bg-neutral-50 opacity-75",
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-normal text-neutral-950">
                {step.label}
              </h3>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  statusClasses[step.status],
                )}
              >
                {statusCopy[step.status]}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              {step.description}
            </p>
            {step.meta ? (
              <p className="mt-2 text-xs font-medium text-neutral-400">
                {step.meta}
              </p>
            ) : null}
          </div>

          {step.cta ? <JourneyAction action={step.cta} blocked={isBlocked} /> : null}
        </div>
      </div>
    </li>
  );
}

function JourneyAction({
  action,
  blocked,
}: {
  action: NonNullable<JourneyStepItem["cta"]>;
  blocked: boolean;
}) {
  const classes = cn(
    "inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold transition",
    action.disabled || blocked
      ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
      : "bg-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.14)] hover:bg-neutral-800",
  );

  if (action.href && !action.disabled && !blocked) {
    return (
      <Link href={action.href} className={classes}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={action.onClick}
      disabled={action.disabled || blocked}
    >
      {action.label}
    </button>
  );
}

export function CreatorSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-4">
          <h2 className="shrink-0 text-sm font-semibold text-neutral-950">
            {title}
          </h2>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SoftStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-normal text-neutral-950">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.2 6.5 11 12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
