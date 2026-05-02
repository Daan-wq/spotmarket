import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SignalRow, type SignalRowData } from "@/components/admin/signal-row";
import type { SignalSeverity, SignalType } from "@/lib/contracts/signals";
import Link from "next/link";

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

  function FilterChip({ label, active, href }: { label: string; active: boolean; href: string }) {
    return (
      <Link
        href={href}
        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        style={{
          background: active ? "var(--accent)" : "var(--bg-card)",
          color: active ? "#fff" : "var(--text-secondary)",
          border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="w-full p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Signals inbox
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          All WARN+ submission signals. Resolve once you've taken action.
        </p>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] uppercase tracking-wide self-center" style={{ color: "var(--text-secondary)" }}>
            Status
          </span>
          <FilterChip label="Open" active={statusFilter === "open"} href={buildHref({ status: "open" })} />
          <FilterChip label="Resolved" active={statusFilter === "resolved"} href={buildHref({ status: "resolved" })} />
          <FilterChip label="All" active={statusFilter === "all"} href={buildHref({ status: "all" })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] uppercase tracking-wide self-center" style={{ color: "var(--text-secondary)" }}>
            Severity
          </span>
          <FilterChip label="Any" active={severityFilter === null} href={buildHref({ severity: null })} />
          {SEVERITY_OPTIONS.map((sev) => (
            <FilterChip
              key={sev}
              label={sev}
              active={severityFilter === sev}
              href={buildHref({ severity: sev })}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] uppercase tracking-wide self-center" style={{ color: "var(--text-secondary)" }}>
            Type
          </span>
          <FilterChip label="Any" active={typeFilter === null} href={buildHref({ type: null })} />
          {SIGNAL_TYPES.map((t) => (
            <FilterChip
              key={t}
              label={t.replaceAll("_", " ").toLowerCase()}
              active={typeFilter === t}
              href={buildHref({ type: t })}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              No signals match these filters.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Subsystem A produces velocity / ratio / bot / token signals; Subsystem D adds logo-missing during manual
              review.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaign / Creator</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>When</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SignalRow key={row.id} signal={row} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
