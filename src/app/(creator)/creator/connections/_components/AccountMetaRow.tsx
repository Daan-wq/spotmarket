import type { ReactNode } from "react";

interface Props {
  label: string;
  meta: string;
  lastSyncedText?: string;
  refreshStatus?: string;
  lastSuccessfulRefreshAt?: string | null;
  lastRefreshErrorMessage?: string | null;
  removeButton?: ReactNode;
}

export function AccountMetaRow({
  label,
  meta,
  lastSyncedText,
  refreshStatus,
  lastSuccessfulRefreshAt,
  lastRefreshErrorMessage,
  removeButton,
}: Props) {
  const syncText = lastSyncedText ?? formatRefreshStatus(refreshStatus, lastSuccessfulRefreshAt ?? null);

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
          {meta} - {syncText}
        </p>
        {refreshStatus === "FAILED" ? (
          <p className="mt-1 text-xs text-red-600">
            Refresh failed{lastRefreshErrorMessage ? `: ${lastRefreshErrorMessage}` : ""}
          </p>
        ) : null}
      </div>
      {removeButton ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {removeButton}
        </div>
      ) : null}
    </div>
  );
}

function formatRefreshStatus(status: string | undefined, value: string | null) {
  if (status === "REFRESHING") return "refreshing";
  if (!value) return "not refreshed yet";
  const d = new Date(value);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
  return `last refreshed ${formattedDate}`;
}
