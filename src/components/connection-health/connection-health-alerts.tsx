"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ConnectionHealthAlertItem } from "@/lib/connection-health";
import { PlatformLogo } from "@/platform-icons";

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
  close: string;
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

  const incidents = query.data.incidents;
  if (incidents.length === 0) return null;

  const limit =
    viewerRole === "admin" ? ADMIN_VISIBLE_LIMIT : CREATOR_VISIBLE_LIMIT;
  const overflow = Math.max(0, incidents.length - limit);
  const copy: ConnectionHealthAlertCopy = {
    title: t("title"),
    creatorDescription: t("creatorDescription"),
    adminDescription: t("adminDescription"),
    analyticsStopped: t("analyticsStopped"),
    reconnect: t("reconnect"),
    viewConnections: t("viewConnections"),
    unlinkHelp: t("unlinkHelp"),
    close: t("close"),
    viewCreator: t("viewCreator"),
    technicalDetails: t("technicalDetails"),
    moreIncidents: t("moreIncidents", { count: overflow }),
  };

  return (
    <DismissibleConnectionHealthAlert
      key={incidents.map((incident) => incident.id).join("|")}
      incidents={incidents}
      viewerRole={viewerRole}
      copy={copy}
    />
  );
}

function DismissibleConnectionHealthAlert({
  incidents,
  viewerRole,
  copy,
}: {
  incidents: ConnectionHealthAlertItem[];
  viewerRole: "creator" | "admin";
  copy: ConnectionHealthAlertCopy;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (!isClosing) return;
    const timeout = window.setTimeout(() => setIsClosed(true), 200);
    return () => window.clearTimeout(timeout);
  }, [isClosing]);

  if (isClosed) return null;

  return (
    <div
      aria-hidden={isClosing}
      className={`mb-5 w-full origin-top-right transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0 lg:fixed lg:right-6 lg:top-6 lg:z-[70] lg:mb-0 ${
        viewerRole === "creator" ? "lg:w-[390px]" : "lg:w-[430px]"
      } ${
        isClosing
          ? "pointer-events-none translate-x-3 scale-[0.98] opacity-0"
          : "translate-x-0 scale-100 opacity-100"
      }`}
    >
      <ConnectionHealthAlertPanel
        incidents={incidents}
        viewerRole={viewerRole}
        copy={copy}
        onClose={() => setIsClosing(true)}
      />
    </div>
  );
}

export function ConnectionHealthAlertPanel({
  incidents,
  viewerRole,
  copy,
  onClose,
}: {
  incidents: ConnectionHealthAlertItem[];
  viewerRole: "creator" | "admin";
  copy: ConnectionHealthAlertCopy;
  onClose: () => void;
}) {
  const limit =
    viewerRole === "admin" ? ADMIN_VISIBLE_LIMIT : CREATOR_VISIBLE_LIMIT;
  const displayed = incidents.slice(0, limit);
  const overflow = Math.max(0, incidents.length - displayed.length);

  if (viewerRole === "creator") {
    return (
      <CreatorConnectionHealthPanel
        incidents={displayed}
        copy={copy}
        onClose={onClose}
      />
    );
  }

  const groups =
    groupByCreator(displayed);

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
        <div className="min-w-0 flex-1">
          <h2
            id="connection-health-alert-title"
            className="text-sm font-bold leading-5 text-amber-950"
          >
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-amber-900">
            {copy.adminDescription}
          </p>
        </div>
        <AlertCloseButton label={copy.close} onClose={onClose} tone="admin" />
      </header>

      <div className="max-h-[min(68vh,560px)] overflow-y-auto">
        {groups.map((group) => (
          <div
            key={group.creatorProfileId || "creator"}
            className="border-b border-amber-200 last:border-b-0"
          >
            <div className="bg-amber-100/70 px-4 py-2">
              <p className="text-xs font-bold text-amber-950">
                {group.creatorName}
              </p>
            </div>
            {group.incidents.map((incident) => (
              <AdminIncidentRow
                key={incident.id}
                incident={incident}
                copy={copy}
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

function CreatorConnectionHealthPanel({
  incidents,
  copy,
  onClose,
}: {
  incidents: ConnectionHealthAlertItem[];
  copy: ConnectionHealthAlertCopy;
  onClose: () => void;
}) {
  return (
    <section
      role="region"
      aria-labelledby="connection-health-alert-title"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-[#e0ded8] bg-white shadow-[0_12px_34px_rgba(31,29,22,0.07)]"
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d89736] ring-4 ring-[#fbf0df]"
          aria-hidden
        />
        <div className="min-w-0">
          <h2
            id="connection-health-alert-title"
            className="text-sm font-semibold tracking-[-0.015em] text-[#1f1f1a]"
          >
            {copy.title}
          </h2>
          {incidents.length > 1 ? (
            <p className="mt-0.5 text-[11px] leading-4 text-[#77736b]">
              {copy.creatorDescription}
            </p>
          ) : null}
        </div>
        <AlertCloseButton label={copy.close} onClose={onClose} />
      </header>

      <div>
        {incidents.map((incident) => (
          <CreatorIncidentRow
            key={incident.id}
            incident={incident}
            copy={copy}
          />
        ))}
      </div>
    </section>
  );
}

function CreatorIncidentRow({
  incident,
  copy,
}: {
  incident: ConnectionHealthAlertItem;
  copy: ConnectionHealthAlertCopy;
}) {
  return (
    <article className="border-t border-[#ecebe6] px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1f0eb]">
            <PlatformLogo
              platform={incident.connectionType}
              size={17}
              decorative
            />
          </span>
          <p className="truncate text-xs font-semibold tracking-[-0.015em] text-[#24241f]">
            {incident.connectionLabel}
          </p>
        </div>
        <Link
          href={incident.connectionHref}
          className="shrink-0 rounded-full bg-[#25251f] px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#3a3931] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d59a44] focus-visible:ring-offset-2"
        >
          {copy.reconnect}
          <ArrowUpRight
            size={13}
            strokeWidth={2}
            className="ml-1 inline-block"
            aria-hidden
          />
        </Link>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#696961]">
        {copy.analyticsStopped}
      </p>

      <div className="mt-3">
        <p className="text-[10px] leading-4 text-[#89857d]">
          {copy.unlinkHelp}{" "}
          <Link
            href={incident.connectionHref}
            className="font-semibold text-[#57544e] underline decoration-current/40 underline-offset-2"
          >
            {copy.viewConnections}
          </Link>
        </p>
      </div>
    </article>
  );
}

function AdminIncidentRow({
  incident,
  copy,
}: {
  incident: ConnectionHealthAlertItem;
  copy: ConnectionHealthAlertCopy;
}) {
  return (
    <article className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlatformLogo
            platform={incident.connectionType}
            size={20}
            decorative
            className="shrink-0"
          />
          <p className="truncate text-sm font-bold text-amber-950">
            {incident.connectionLabel}
          </p>
        </div>
        <Link
          href={incident.creatorHref}
          className="shrink-0 rounded-full bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-900"
        >
          {copy.viewCreator}
        </Link>
      </div>

      <p className="mt-2 text-xs leading-5 text-amber-900">
        {copy.analyticsStopped}
      </p>

      {incident.providerDetails ? (
        <details className="mt-2 text-xs text-amber-800">
          <summary className="cursor-pointer font-bold">
            {copy.technicalDetails}
          </summary>
          <p className="mt-1 break-words leading-5">
            {formatProviderDetails(incident.providerDetails)}
          </p>
        </details>
      ) : null}
    </article>
  );
}

function AlertCloseButton({
  label,
  onClose,
  tone = "creator",
}: {
  label: string;
  onClose: () => void;
  tone?: "creator" | "admin";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClose}
      className={`ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        tone === "admin"
          ? "text-amber-700 hover:bg-amber-200/70 hover:text-amber-950 focus-visible:ring-amber-700"
          : "text-[#8a877f] hover:bg-[#f1f0eb] hover:text-[#25251f] focus-visible:ring-[#d59a44]"
      }`}
    >
      <X size={15} strokeWidth={1.8} aria-hidden />
    </button>
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
