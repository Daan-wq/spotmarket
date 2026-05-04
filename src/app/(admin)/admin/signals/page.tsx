import type { Prisma } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { SignalActions, type SignalRowData } from "@/components/admin/signal-row";
import { prisma } from "@/lib/prisma";
import type { SignalSeverity, SignalType } from "@/lib/contracts/signals";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const SIGNAL_TYPES: SignalType[] = [
  "VELOCITY_SPIKE",
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
          creator: { select: { email: true } },
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
  }));

  const critical = rows.filter((row) => row.severity === "CRITICAL").length;
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
        eyebrow="Risk"
        title="Signals inbox"
        description="WARN+ submission signals. Resolve each signal once action has been taken."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Matching signals" value={String(rows.length)} detail="Current filter view" tone={rows.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Critical" value={String(critical)} detail="Needs fastest action" tone={critical > 0 ? "danger" : "neutral"} />
        <StatCard label="Token broken" value={String(tokenSignals)} detail="Reconnect nudges available" tone={tokenSignals > 0 ? "warning" : "neutral"} />
        <StatCard label="Resolved" value={String(resolved)} detail="In this view" />
      </div>

      <section>
        <SectionHeader
          title="Signal Table"
          description="Filters stay behind the drawer so the inbox opens to the work itself."
          action={
            <ProgressiveActionDrawer
              triggerLabel="Filters"
              title="Signal filters"
              description="Narrow by status, severity, or signal type."
              variant="outline"
              width="lg"
              badgeLabel={typeFilter || severityFilter || statusFilter !== "open" ? "On" : undefined}
            >
              <div className="space-y-5">
                <FilterGroup label="Status">
                  <FilterChip label="Open" active={statusFilter === "open"} href={buildHref({ status: "open" })} />
                  <FilterChip label="Resolved" active={statusFilter === "resolved"} href={buildHref({ status: "resolved" })} />
                  <FilterChip label="All" active={statusFilter === "all"} href={buildHref({ status: "all" })} />
                </FilterGroup>
                <FilterGroup label="Severity">
                  <FilterChip label="Any" active={severityFilter === null} href={buildHref({ severity: null })} />
                  {SEVERITY_OPTIONS.map((severity) => (
                    <FilterChip key={severity} label={titleCaseEnum(severity)} active={severityFilter === severity} href={buildHref({ severity })} />
                  ))}
                </FilterGroup>
                <FilterGroup label="Type">
                  <FilterChip label="Any" active={typeFilter === null} href={buildHref({ type: null })} />
                  {SIGNAL_TYPES.map((type) => (
                    <FilterChip key={type} label={titleCaseEnum(type)} active={typeFilter === type} href={buildHref({ type })} />
                  ))}
                </FilterGroup>
              </div>
            </ProgressiveActionDrawer>
          }
        />

        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          emptyState={<EmptyState title="No signals match these filters" description="Try another filter set, or return to open signals." />}
          columns={[
            { key: "severity", header: "Severity", cell: (row) => <Badge variant={row.severity === "CRITICAL" ? "failed" : "pending"}>{titleCaseEnum(row.severity)}</Badge> },
            { key: "type", header: "Type", cell: (row) => titleCaseEnum(row.type) },
            {
              key: "source",
              header: "Campaign / Creator",
              cell: (row) => (
                <div>
                  <p className="font-medium text-neutral-950">{row.campaignName ?? "-"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{row.creatorEmail ?? "-"}</p>
                </div>
              ),
            },
            { key: "reason", header: "Reason", cell: (row) => <span className="text-xs text-neutral-500">{getReason(row.payload) || "-"}</span> },
            { key: "when", header: "When", cell: (row) => formatDate(row.createdAt) },
            { key: "actions", header: "Actions", cell: (row) => <SignalActions signal={row} /> },
          ]}
        />
      </section>
    </div>
  );
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

function getReason(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  const reason = payload.reason;
  return typeof reason === "string" ? reason : "";
}
