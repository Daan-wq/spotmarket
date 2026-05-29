import Link from "next/link";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const STAGES = [
  "FOUND",
  "CONTACTED",
  "PORTFOLIO_RECEIVED",
  "TRIAL_SENT",
  "TRIAL_SUBMITTED",
  "APPROVED",
  "REJECTED",
  "ADDED_TO_DATABASE",
] as const;

export default async function RecruitmentPage() {
  const now = new Date();
  const candidates = await prisma.clipperCandidate.findMany({
    orderBy: [{ trialDueAt: "asc" }, { updatedAt: "desc" }],
    include: { approvedCreatorProfile: { select: { id: true, displayName: true } } },
    take: 100,
  });

  const counts = new Map(STAGES.map((stage) => [stage, candidates.filter((candidate) => candidate.stage === stage).length]));
  const trialDue = candidates.filter((candidate) => candidate.trialDueAt && candidate.trialDueAt <= now && !["APPROVED", "REJECTED", "ADDED_TO_DATABASE"].includes(candidate.stage));
  const approved = candidates.filter((candidate) => candidate.stage === "APPROVED" || candidate.stage === "ADDED_TO_DATABASE");
  const avgScore = candidates.filter((candidate) => candidate.score != null).reduce((sum, candidate, _, arr) => sum + (candidate.score ?? 0) / arr.length, 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Bezetting"
        title="Recruitment"
        description="Kandidatenpipeline van gevonden creators naar trial, goedkeuring en database-entry."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Kandidaten" value={String(candidates.length)} detail="Alle recruitmentrecords" />
        <StatCard label="Trials nodig" value={String(trialDue.length)} detail="Trialwerk dat nu of eerder klaar moet zijn" tone={trialDue.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Goedgekeurd" value={String(approved.length)} detail="Goedgekeurd of toegevoegd aan database" />
        <StatCard label="Gem. score" value={avgScore ? avgScore.toFixed(1) : "-"} detail="Gemiddelde trialscore" />
      </div>

      <section>
        <SectionHeader title="Recruitmentpipeline" description="Van gevonden naar database, zonder trialdatums of scores te verbergen." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {STAGES.map((stage) => (
            <div key={stage} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{titleCaseEnum(stage)}</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-950">{counts.get(stage) ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Kandidatentabel" description="Recruitmentbron, contact, portfolio, trialstatus, score en goedgekeurd profiel." />
        <DataTable
          rows={candidates}
          rowKey={(candidate) => candidate.id}
          emptyState={<EmptyState icon={<Sparkles className="h-5 w-5" />} title="Nog geen kandidaten" description="Voeg kandidaten toe via de recruitment-API om de clipperdatabase te vullen." />}
          columns={[
            {
              key: "name",
              header: "Kandidaat",
              cell: (candidate) => (
                <div>
                  <p className="font-semibold text-neutral-950">{candidate.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{candidate.source || candidate.contact || "Geen bron"}</p>
                </div>
              ),
            },
            { key: "stage", header: "Fase", cell: (candidate) => <Badge variant={candidate.stage === "REJECTED" ? "failed" : candidate.stage === "APPROVED" || candidate.stage === "ADDED_TO_DATABASE" ? "verified" : "neutral"}>{titleCaseEnum(candidate.stage)}</Badge> },
            { key: "contact", header: "Contact", cell: (candidate) => candidate.contact || "-" },
            {
              key: "portfolio",
              header: "Portfolio",
              cell: (candidate) => candidate.portfolioUrl ? (
                <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="font-semibold text-neutral-950 underline underline-offset-2">Openen</a>
              ) : "-",
            },
            { key: "trialSent", header: "Trial verstuurd", cell: (candidate) => formatDate(candidate.trialSentAt) },
            { key: "trialDue", header: "Trialdeadline", cell: (candidate) => formatDate(candidate.trialDueAt) },
            { key: "score", header: "Score", align: "right", cell: (candidate) => candidate.score ?? "-" },
            {
              key: "approved",
              header: "Goedgekeurd profiel",
              cell: (candidate) => candidate.approvedCreatorProfile ? (
                <Link href={`/admin/creators/${candidate.approvedCreatorProfile.id}`} className="font-semibold text-neutral-950 underline underline-offset-2">
                  {candidate.approvedCreatorProfile.displayName}
                </Link>
              ) : "-",
            },
          ]}
        />
      </section>
    </div>
  );
}
