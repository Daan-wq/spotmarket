import type { Prisma } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { SignalActions, type SignalRowData } from "@/components/admin/signal-row";
import { SignalEvidence } from "@/components/admin/signal-evidence";
import { prisma } from "@/lib/prisma";
import type { SignalSeverity, SignalType } from "@/lib/contracts/signals";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const SIGNAL_TYPES: SignalType[] = [
  "VELOCITY_DROP",
  "RATIO_ANOMALY",
  "BOT_SUSPECTED",
  "LOGO_MISSING",
  "DUPLICATE",
  "TOKEN_BROKEN",
];

const SEVERITY_OPTIONS: SignalSeverity[] = ["WARN", "CRITICAL"];

interface PageProps {
  searchParams: Promise<{ type?: string; severity?: string; status?: string }>;
}
export default async function SignalsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const typeFilter = SIGNAL_TYPES.includes(sp.type as SignalType) ? (sp.type as SignalType) : null;
  const severityFilter = SEVERITY_OPTIONS.includes(sp.severity as SignalSeverity)
    ? (sp.severity as SignalSeverity)
    : null;
  const statusFilter = sp.status === "resolved" ? "resolved" : sp.status === "all" ? "all" : "open";

  const where: Prisma.SubmissionSignalWhereInput = {
    severity: { in: ["WARN", "CRITICAL"] },
    NOT: { type: "VELOCITY_SPIKE" },
  };
  if (typeFilter) where.type = typeFilter;
  if (severityFilter) where.severity = severityFilter;
  if (statusFilter === "open") where.resolvedAt = null;
  if (statusFilter === "resolved") where.resolvedAt = { not: null };

  const signals = await prisma.submissionSignal.findMany({
    where,
    orderBy: [{ resolvedAt: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      submission: {
        select: {
          postUrl: true,
          creatorId: true,
          campaign: { select: { name: true } },
          creator: { select: { email: true, creatorProfile: { select: { id: true } } } },
        },
      },
    },
  });

  const rows: SignalRowData[] = signals.map((s) => ({
    id: s.id,
    submissionId: s.submissionId,
    type: s.type,
    severity: s.severity,
    payload: (s.payload as Record<string, unknown>) ?? null,
    createdAt: s.createdAt.toISOString(),
    resolvedAt: s.resolvedAt?.toISOString() ?? null,
    campaignName: s.submission?.campaign?.name ?? null,
    creatorEmail: s.submission?.creator?.email ?? null,
    postUrl: s.submission?.postUrl ?? null,
    creatorId: s.submission?.creatorId ?? null,
    creatorProfileId: s.submission?.creator?.creatorProfile?.id ?? null,
  }));

  const critical = rows.filter((row) => row.severity === "CRITICAL").length;
  const botSignals = rows.filter((row) => row.type === "BOT_SUSPECTED").length;
  const tokenSignals = rows.filter((row) => row.type === "TOKEN_BROKEN").length;
  const resolved = rows.filter((row) => row.resolvedAt).length;

  const buildHref = (overrides: Partial<{ type: string | null; severity: string | null; status: string }>) => {
    const params = new URLSearchParams();
    const t = overrides.type !== undefined ? overrides.type : typeFilter;
    const sev = overrides.severity !== undefined ? overrides.severity : severityFilter;
    const st = overrides.status ?? statusFilter;
    if (t) params.set("type", t);
    if (sev) params.set("severity", sev);
    if (st && st !== "open") params.set("status", st);
    const q = params.toString();
    return q ? `/admin/signals?${q}` : "/admin/signals";
  };

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Risico"
        title="Signalen"
        description="Open waarschuwingen voor inzendingen. Los een signaal op zodra je het hebt beoordeeld of opgevolgd."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard label="Signalen" value={String(rows.length)} detail="Huidige filterweergave" tone={rows.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Kritiek" value={String(critical)} detail="Snelste actie nodig" tone={critical > 0 ? "danger" : "neutral"} />
        <StatCard label="Botverdenking" value={String(botSignals)} detail="Beoordelingsrij voor verdachte views" tone={botSignals > 0 ? "danger" : "neutral"} />
        <StatCard label="Token stuk" value={String(tokenSignals)} detail="Herinnering voor opnieuw koppelen mogelijk" tone={tokenSignals > 0 ? "warning" : "neutral"} />
        <StatCard label="Opgelost" value={String(resolved)} detail="In deze weergave" />
      </div>

      <section>
        <SectionHeader
          title="Signaaltabel"
          description="Filters staan in het paneel zodat de inbox direct op het werk opent."
          action={
            <ProgressiveActionDrawer
              triggerLabel="Filters"
              title="Signaalfilters"
              description="Filter op status, ernst of type signaal."
              variant="outline"
              width="lg"
              badgeLabel={typeFilter || severityFilter || statusFilter !== "open" ? "Aan" : undefined}
            >
              <div className="space-y-5">
                <FilterGroup label="Status">
                  <FilterChip label="Open" active={statusFilter === "open"} href={buildHref({ status: "open" })} />
                  <FilterChip label="Opgelost" active={statusFilter === "resolved"} href={buildHref({ status: "resolved" })} />
                  <FilterChip label="Alles" active={statusFilter === "all"} href={buildHref({ status: "all" })} />
                </FilterGroup>
                <FilterGroup label="Ernst">
                  <FilterChip label="Alles" active={severityFilter === null} href={buildHref({ severity: null })} />
                  {SEVERITY_OPTIONS.map((severity) => (
                    <FilterChip key={severity} label={severityLabel(severity)} active={severityFilter === severity} href={buildHref({ severity })} />
                  ))}
                </FilterGroup>
                <FilterGroup label="Type">
                  <FilterChip label="Alles" active={typeFilter === null} href={buildHref({ type: null })} />
                  {SIGNAL_TYPES.map((type) => (
                    <FilterChip key={type} label={signalTypeLabel(type)} active={typeFilter === type} href={buildHref({ type })} />
                  ))}
                </FilterGroup>
              </div>
            </ProgressiveActionDrawer>
          }
        />

        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          emptyState={<EmptyState title="Geen signalen voor deze filters" description="Probeer andere filters of ga terug naar open signalen." />}
          columns={[
            { key: "severity", header: "Ernst", cell: (row) => <Badge variant={row.severity === "CRITICAL" ? "failed" : "pending"}>{severityLabel(row.severity)}</Badge> },
            { key: "type", header: "Type", cell: (row) => signalTypeLabel(row.type) },
            {
              key: "source",
              header: "Campagne / maker",
              cell: (row) => (
                <div>
                  <p className="font-medium text-neutral-950">{row.campaignName ?? "-"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{row.creatorEmail ?? "-"}</p>
                </div>
              ),
            },
            { key: "reason", header: "Reden", cell: (row) => <SignalEvidence payload={row.payload} /> },
            { key: "when", header: "Wanneer", cell: (row) => formatDate(row.createdAt, "nl") },
            { key: "actions", header: "Acties", cell: (row) => <SignalActions signal={row} /> },
          ]}
        />
      </section>
    </div>
  );
}

function signalTypeLabel(type: SignalType): string {
  if (type === "BOT_SUSPECTED") return "Botverdenking";
  if (type === "VELOCITY_DROP") return "Snelheidsdaling";
  if (type === "RATIO_ANOMALY") return "Ratio-afwijking";
  if (type === "LOGO_MISSING") return "Logo ontbreekt";
  if (type === "DUPLICATE") return "Dubbel";
  if (type === "TOKEN_BROKEN") return "Token stuk";
  if (type === "VELOCITY_SPIKE") return "Oud signaal";
  return titleCaseEnum(type);
}

function severityLabel(severity: SignalSeverity): string {
  if (severity === "CRITICAL") return "Kritiek";
  if (severity === "WARN") return "Waarschuwing";
  return "Info";
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {label}
    </Link>
  );
}
