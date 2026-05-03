import Link from "next/link";
import { Sparkles } from "lucide-react";
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
        eyebrow="Staffing"
        title="Recruitment"
        description="Applicant pipeline from found creators to trial, approval, and database entry."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Candidates" value={String(candidates.length)} detail="All recruitment records" />
        <StatCard label="Trials due" value={String(trialDue.length)} detail="Due or overdue trial work" tone={trialDue.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Approved" value={String(approved.length)} detail="Approved or added to database" />
        <StatCard label="Avg score" value={avgScore ? avgScore.toFixed(1) : "-"} detail="Trial score average" />
      </div>

      <section>
        <SectionHeader title="Recruitment Pipeline" description="Found to database, without hiding trial dates or scores." />
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
        <SectionHeader title="Candidate Table" description="Recruitment source, contact, portfolio, trial state, score, and approved profile." />
        <DataTable
          rows={candidates}
          rowKey={(candidate) => candidate.id}
          emptyState={<EmptyState icon={<Sparkles className="h-5 w-5" />} title="No candidates yet" description="Add candidates through the recruitment API to start staffing the clipper database." />}
          columns={[
            {
              key: "name",
              header: "Candidate",
              cell: (candidate) => (
                <div>
                  <p className="font-semibold text-neutral-950">{candidate.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{candidate.source || candidate.contact || "No source"}</p>
                </div>
              ),
            },
            { key: "stage", header: "Stage", cell: (candidate) => <Badge variant={candidate.stage === "REJECTED" ? "failed" : candidate.stage === "APPROVED" || candidate.stage === "ADDED_TO_DATABASE" ? "verified" : "neutral"}>{titleCaseEnum(candidate.stage)}</Badge> },
            { key: "contact", header: "Contact", cell: (candidate) => candidate.contact || "-" },
            {
              key: "portfolio",
              header: "Portfolio",
              cell: (candidate) => candidate.portfolioUrl ? (
                <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="font-semibold text-neutral-950 underline underline-offset-2">
                  Open
                </a>
              ) : "-",
            },
            { key: "trialSent", header: "Trial sent", cell: (candidate) => formatDate(candidate.trialSentAt) },
            { key: "trialDue", header: "Trial due", cell: (candidate) => formatDate(candidate.trialDueAt) },
            { key: "score", header: "Score", align: "right", cell: (candidate) => candidate.score ?? "-" },
            {
              key: "approved",
              header: "Approved profile",
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
