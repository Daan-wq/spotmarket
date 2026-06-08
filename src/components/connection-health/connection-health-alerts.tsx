"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ConnectionHealthAlertItem } from "@/lib/connection-health";

const QUERY_KEY = ["connection-health"] as const;
const ADMIN_VISIBLE_LIMIT = 8;
const CREATOR_VISIBLE_LIMIT = 10;

export interface ConnectionHealthAlertCopy {
  title: string;
  creatorDescription: string;
  adminDescription: string;
  analyticsStopped: string;
  reconnect: string;
  viewConnections: string;
  unlinkHelp: string;
  doNotRemind: string;
  viewCreator: string;
  technicalDetails: string;
  moreIncidents: string;
}

interface ConnectionHealthAlertsProps {
  initialIncidents: ConnectionHealthAlertItem[];
  viewerRole: "creator" | "admin";
}

interface ConnectionHealthResponse {
  incidents: ConnectionHealthAlertItem[];
}

export function ConnectionHealthAlerts({
  initialIncidents,
  viewerRole,
}: ConnectionHealthAlertsProps) {
  const t = useTranslations("connectionHealth");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ConnectionHealthResponse> => {
      const response = await fetch("/api/connection-health");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ConnectionHealthResponse>;
    },
    initialData: { incidents: initialIncidents },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: async ({
      incidentId,
      dismissed,
    }: {
      incidentId: string;
      dismissed: boolean;
    }) => {
      const response = await fetch(
        `/api/connection-health/${encodeURIComponent(incidentId)}/dismiss`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dismissed }),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
    onMutate: async ({ incidentId, dismissed }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous =
        queryClient.getQueryData<ConnectionHealthResponse>(QUERY_KEY);
      queryClient.setQueryData<ConnectionHealthResponse>(QUERY_KEY, (current) => ({
        incidents: (current?.incidents ?? []).map((incident) =>
          incident.id === incidentId ? { ...incident, dismissed } : incident,
        ),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const visible = query.data.incidents.filter((incident) => !incident.dismissed);
  if (visible.length === 0) return null;

  const limit =
    viewerRole === "admin" ? ADMIN_VISIBLE_LIMIT : CREATOR_VISIBLE_LIMIT;
  const overflow = Math.max(0, visible.length - limit);
  const copy: ConnectionHealthAlertCopy = {
    title: t("title"),
    creatorDescription: t("creatorDescription"),
    adminDescription: t("adminDescription"),
    analyticsStopped: t("analyticsStopped"),
    reconnect: t("reconnect"),
    viewConnections: t("viewConnections"),
    unlinkHelp: t("unlinkHelp"),
    doNotRemind: t("doNotRemind"),
    viewCreator: t("viewCreator"),
    technicalDetails: t("technicalDetails"),
    moreIncidents: t("moreIncidents", { count: overflow }),
  };

  return (
    <div className="mb-5 w-full lg:fixed lg:right-6 lg:top-6 lg:z-[70] lg:mb-0 lg:w-[430px]">
      <ConnectionHealthAlertPanel
        incidents={visible}
        viewerRole={viewerRole}
        copy={copy}
        onDismiss={(incidentId) =>
          mutation.mutate({ incidentId, dismissed: true })
        }
      />
    </div>
  );
}

export function ConnectionHealthAlertPanel({
  incidents,
  viewerRole,
  copy,
  onDismiss,
}: {
  incidents: ConnectionHealthAlertItem[];
  viewerRole: "creator" | "admin";
  copy: ConnectionHealthAlertCopy;
  onDismiss: (incidentId: string, dismissed: boolean) => void;
}) {
  const limit =
    viewerRole === "admin" ? ADMIN_VISIBLE_LIMIT : CREATOR_VISIBLE_LIMIT;
  const displayed = incidents.slice(0, limit);
  const overflow = Math.max(0, incidents.length - displayed.length);
  const groups =
    viewerRole === "admin"
      ? groupByCreator(displayed)
      : [{ creatorProfileId: "", creatorName: "", incidents: displayed }];

  return (
    <section
      role="region"
      aria-labelledby="connection-health-alert-title"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-[0_18px_48px_rgba(70,45,5,0.16)]"
    >
      <header className="flex gap-3 border-b border-amber-200 px-4 py-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900">
          <AlertTriangle size={17} aria-hidden />
        </span>
        <div>
          <h2
            id="connection-health-alert-title"
            className="text-sm font-bold leading-5 text-amber-950"
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-amber-900">
            {viewerRole === "creator"
              ? copy.creatorDescription
              : copy.adminDescription}
          </p>
        </div>
      </header>

      <div className="max-h-[min(68vh,560px)] overflow-y-auto">
        {groups.map((group) => (
          <div
            key={group.creatorProfileId || "creator"}
            className="border-b border-amber-200 last:border-b-0"
          >
            {viewerRole === "admin" ? (
              <div className="bg-amber-100/70 px-4 py-2">
                <p className="text-xs font-bold text-amber-950">
                  {group.creatorName}
                </p>
              </div>
            ) : null}
            {group.incidents.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                viewerRole={viewerRole}
                copy={copy}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        ))}
      </div>

      {overflow > 0 ? (
        <Link
          href="/admin/signals?type=TOKEN_BROKEN"
          className="flex items-center justify-center gap-1.5 border-t border-amber-200 px-4 py-3 text-xs font-bold text-amber-950 hover:bg-amber-100"
        >
          {copy.moreIncidents}
          <ExternalLink size={13} aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}

function IncidentRow({
  incident,
  viewerRole,
  copy,
  onDismiss,
}: {
  incident: ConnectionHealthAlertItem;
  viewerRole: "creator" | "admin";
  copy: ConnectionHealthAlertCopy;
  onDismiss: (incidentId: string, dismissed: boolean) => void;
}) {
  return (
    <article className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-amber-950">
            {incident.connectionLabel}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
            {platformLabel(incident.connectionType)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewerRole === "creator" ? (
            <Link
              href={incident.reconnectHref}
              className="rounded-full bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-900"
            >
              {copy.reconnect}
            </Link>
          ) : (
            <Link
              href={incident.creatorHref}
              className="rounded-full bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-900"
            >
              {copy.viewCreator}
            </Link>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-amber-900">
        {copy.analyticsStopped}
      </p>

      {viewerRole === "creator" ? (
        <p className="mt-1.5 text-xs leading-5 text-amber-800">
          {copy.unlinkHelp}{" "}
          <Link
            href={incident.connectionHref}
            className="font-bold underline underline-offset-2"
          >
            {copy.viewConnections}
          </Link>
        </p>
      ) : incident.providerDetails ? (
        <details className="mt-2 text-xs text-amber-800">
          <summary className="cursor-pointer font-bold">
            {copy.technicalDetails}
          </summary>
          <p className="mt-1 break-words leading-5">
            {formatProviderDetails(incident.providerDetails)}
          </p>
        </details>
      ) : null}

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-950">
        <input
          type="checkbox"
          checked={incident.dismissed}
          onChange={(event) => onDismiss(incident.id, event.target.checked)}
          className="h-4 w-4 rounded border-amber-500 accent-amber-900"
        />
        {copy.doNotRemind}
      </label>
    </article>
  );
}

function groupByCreator(incidents: ConnectionHealthAlertItem[]) {
  const groups = new Map<
    string,
    {
      creatorProfileId: string;
      creatorName: string;
      incidents: ConnectionHealthAlertItem[];
    }
  >();
  for (const incident of incidents) {
    const current = groups.get(incident.creatorProfileId);
    if (current) {
      current.incidents.push(incident);
    } else {
      groups.set(incident.creatorProfileId, {
        creatorProfileId: incident.creatorProfileId,
        creatorName: incident.creatorName,
        incidents: [incident],
      });
    }
  }
  return [...groups.values()];
}

function platformLabel(type: ConnectionHealthAlertItem["connectionType"]) {
  return {
    IG: "Instagram",
    TT: "TikTok",
    YT: "YouTube",
    FB: "Facebook",
  }[type];
}

function formatProviderDetails(
  details: NonNullable<ConnectionHealthAlertItem["providerDetails"]>,
) {
  const identifiers = [
    details.type,
    details.code ? `code ${details.code}` : null,
    details.subcode ? `subcode ${details.subcode}` : null,
  ].filter(Boolean);
  return [identifiers.join(", "), details.message].filter(Boolean).join(": ");
}
