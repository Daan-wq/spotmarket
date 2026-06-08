import type { ReactNode } from "react";

interface Props {
  label: string;
  meta: string;
  lastSyncedText?: string;
  refreshStatus?: string;
  lastSuccessfulRefreshAt?: string | null;
  lastRefreshErrorMessage?: string | null;
  requiresReconnect?: boolean;
  reconnectRequiredText?: string;
  analyticsStoppedText?: string;
  refreshFailedText?: string;
  showTechnicalError?: boolean;
  removeButton?: ReactNode;
}

export function AccountMetaRow({
  label,
  meta,
  lastSyncedText,
  refreshStatus,
  lastSuccessfulRefreshAt,
  lastRefreshErrorMessage,
  requiresReconnect = false,
  reconnectRequiredText = "Reconnect required",
  analyticsStoppedText = "Analytics tracking has stopped.",
  refreshFailedText = "Refresh temporarily unavailable.",
  showTechnicalError = false,
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
        {requiresReconnect ? (
          <div className="mt-1">
            <p className="text-xs font-semibold text-amber-700">
              {reconnectRequiredText}
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {analyticsStoppedText}
            </p>
            {showTechnicalError && lastRefreshErrorMessage ? (
              <p className="mt-1 text-xs text-red-600">
                {lastRefreshErrorMessage}
              </p>
            ) : null}
          </div>
        ) : refreshStatus === "FAILED" ? (
          <p className="mt-1 text-xs text-red-600">
            {showTechnicalError && lastRefreshErrorMessage
              ? `${refreshFailedText}: ${lastRefreshErrorMessage}`
              : refreshFailedText}
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
