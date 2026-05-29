import Link from "next/link";
import { GitPullRequestArrow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { prisma } from "@/lib/prisma";
import { formatDate, isPast } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Niet gestart",
  IN_PROGRESS: "Bezig",
  SUBMITTED: "Ingediend",
  NEEDS_REVISION: "Revisie nodig",
  APPROVED: "Goedgekeurd",
  POSTED: "Geplaatst",
  REJECTED: "Afgekeurd",
  PAID: "Betaald",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export default async function ProductionPage() {
  const now = new Date();
  const assignments = await prisma.productionAssignment.findMany({
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    include: {
      campaign: { select: { id: true, name: true, platforms: true } },
      brand: { select: { id: true, name: true } },
      creatorProfile: { select: { id: true, displayName: true, user: { select: { email: true } } } },
      submission: { select: { id: true, status: true, postUrl: true } },
    },
    take: 150,
  });

  const due = assignments.filter((assignment) => ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVISION"].includes(assignment.status));
  const overdue = due.filter((assignment) => isPast(assignment.dueAt, now));
  const submitted = assignments.filter((assignment) => assignment.status === "SUBMITTED" || assignment.submission);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Levering"
        title="Productie"
        description="Opdrachtentracker voor de eindinzending: deadlines, creator, merk, campagne, contenthoek, revisiestatus en te-late filters."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Opdrachten" value={String(assignments.length)} detail="Alle toegewezen clips" />
        <StatCard label="Open werk" value={String(due.length)} detail="Niet gestart, bezig of in revisie" />
        <StatCard label="Te laat" value={String(overdue.length)} detail="Deadline voor vandaag" tone={overdue.length > 0 ? "danger" : "neutral"} />
        <StatCard label="Ingediend" value={String(submitted.length)} detail="Heeft inzending of ingediende status" />
      </div>

      <section>
        <SectionHeader
          title="Opdrachtentabel"
          description="Productie start hier. Een ingediende livepost is pas een latere stap."
          action={
            <ProgressiveActionDrawer
              triggerLabel="Statusbord"
              title="Productiebord"
              description="Gebruik dit om te zien waar clips vastlopen."
              variant="outline"
              width="lg"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "NEEDS_REVISION", "APPROVED", "POSTED", "REJECTED", "PAID"].map((status) => (
                  <div key={status} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{statusLabel(status)}</p>
                    <p className="mt-3 text-2xl font-semibold text-neutral-950">
                      {assignments.filter((assignment) => assignment.status === status).length}
                    </p>
                  </div>
                ))}
              </div>
            </ProgressiveActionDrawer>
          }
        />
        <DataTable
          rows={assignments}
          rowKey={(assignment) => assignment.id}
          emptyState={<EmptyState icon={<GitPullRequestArrow className="h-5 w-5" />} title="Nog geen productieopdrachten" description="Maak opdrachten vanuit campagnes zodra merkonboarding compleet is." />}
          columns={[
            {
              key: "assignment",
              header: "Opdracht",
              cell: (assignment) => (
                <div>
                  <p className="font-semibold text-neutral-950">{assignment.contentAngle || "Geen contenthoek ingesteld"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{assignment.sourceUrl || "Geen bron-/referentie-URL"}</p>
                </div>
              ),
            },
            {
              key: "brand",
              header: "Merk",
              cell: (assignment) => assignment.brand?.name || <span className="text-neutral-400">Niet gekoppeld</span>,
            },
            {
              key: "campaign",
              header: "Campagne",
              cell: (assignment) => (
                <Link href={`/admin/campaigns/${assignment.campaign.id}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                  {assignment.campaign.name}
                </Link>
              ),
            },
            {
              key: "creator",
              header: "Creator",
              cell: (assignment) => assignment.creatorProfile ? (
                <div>
                  <p className="font-medium text-neutral-950">{assignment.creatorProfile.displayName}</p>
                  <p className="text-xs text-neutral-500">{assignment.creatorProfile.user?.email || "-"}</p>
                </div>
              ) : <Badge variant="pending">Niet toegewezen</Badge>,
            },
            {
              key: "due",
              header: "Deadline",
              cell: (assignment) => (
                <span className={isPast(assignment.dueAt, now) && due.includes(assignment) ? "font-semibold text-red-600" : "text-neutral-600"}>
                  {formatDate(assignment.dueAt)}
                </span>
              ),
            },
            { key: "status", header: "Status", cell: (assignment) => <Badge variant={statusVariant(assignment.status)}>{statusLabel(assignment.status)}</Badge> },
            {
              key: "submission",
              header: "Inzending",
              cell: (assignment) => assignment.submission ? (
                <Link href={`/admin/review?submission=${assignment.submission.id}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                  {statusLabel(assignment.submission.status)}
                </Link>
              ) : <span className="text-neutral-400">Niet ingediend</span>,
            },
          ]}
        />
      </section>
    </div>
  );
}

function statusVariant(status: string) {
  if (status === "APPROVED" || status === "POSTED" || status === "PAID") return "verified";
  if (status === "REJECTED") return "failed";
  if (status === "NEEDS_REVISION") return "pending";
  return "neutral";
}
