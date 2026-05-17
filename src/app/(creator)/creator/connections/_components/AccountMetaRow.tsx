import type { ReactNode } from "react";

interface Props {
  label: string;
  meta: string;
  lastSyncedText: string;
  removeButton?: ReactNode;
}

export function AccountMetaRow({
  label,
  meta,
  lastSyncedText,
  removeButton,
}: Props) {
  return (
    <div
      className="flex flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {meta} - {lastSyncedText}
        </p>
      </div>
      {removeButton ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {removeButton}
        </div>
      ) : null}
    </div>
  );
}
