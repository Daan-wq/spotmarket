import type { ReactNode } from "react";

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
      <div className="min-w-0 flex-1">
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
