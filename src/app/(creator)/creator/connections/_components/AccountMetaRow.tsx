import type { ReactNode } from "react";

interface Props {
  label: string;
  meta: string;
  lastSyncedAt: string | null;
  /** Pre-rendered Remove*PageButton — kept as a ReactNode so each platform's server-action
   *  wiring stays untouched. */
  removeButton: ReactNode;
}

/**
 * Active-account meta row shown beneath the chips row when a single account is selected.
 * Renders label + follower meta + last sync + Disconnect.
 */
export function AccountMetaRow({ label, meta, lastSyncedAt, removeButton }: Props) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {meta} · last synced {formatSync(lastSyncedAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">{removeButton}</div>
    </div>
  );
}

function formatSync(value: string | null) {
  if (!value) return "never";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
