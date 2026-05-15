import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ActionIcon = ComponentType<{ className?: string; animateOnHover?: boolean }>;

interface PageHeaderAction {
  label: string;
  href?: string;
  icon?: ActionIcon;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions = [],
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[34px] font-semibold leading-tight tracking-normal text-neutral-950">
          {title}
        </h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">{description}</p> : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <HeaderAction key={action.label} action={action} />
          ))}
        </div>
      ) : null}
    </header>
  );
}

function HeaderAction({ action }: { action: PageHeaderAction }) {
  const Icon = action.icon;
  const className =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-neutral-800 to-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition hover:from-neutral-700 hover:to-neutral-900";

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {Icon ? <Icon className="h-4 w-4" animateOnHover /> : null}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {action.label}
    </button>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-4">
          <h2 className="shrink-0 text-sm font-semibold text-neutral-950">{title}</h2>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
        {description ? <p className="mt-2 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200"
      : tone === "warning"
        ? "border-orange-200"
        : tone === "danger"
          ? "border-red-200"
          : "border-neutral-200";

  return (
    <div className={cn("rounded-2xl border bg-neutral-50 p-5", toneClass)}>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-normal text-neutral-950">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-neutral-500">{detail}</p> : null}
    </div>
  );
}

export function ActionQueue({
  items,
  emptyLabel = "No urgent work queued.",
}: {
  items: Array<{
    title: string;
    detail: string;
    href: string;
    label?: string;
    tone?: "neutral" | "success" | "warning" | "danger";
  }>;
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {items.map((item) => (
            <Link key={`${item.title}-${item.href}`} href={item.href} className="block px-5 py-4 transition hover:bg-neutral-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{item.detail}</p>
                </div>
                {item.label ? (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                    {item.label}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
