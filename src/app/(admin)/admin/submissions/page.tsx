import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { prisma } from "@/lib/prisma";
import { formatCurrencyPrecise, formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
import SubmissionActions from "./_components/submission-actions";

export default async function SubmissionsPage() {
  const submissions = await prisma.campaignSubmission.findMany({
    include: { campaign: { select: { name: true } }, creator: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pending = submissions.filter((submission) => submission.status === "PENDING").length;
  const approved = submissions.filter((submission) => submission.status === "APPROVED").length;
  const issues = submissions.filter((submission) => submission.status === "REJECTED" || submission.status === "FLAGGED").length;
  const earned = submissions.reduce((sum, submission) => sum + Number(submission.earnedAmount), 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Inzendingen"
        title="Inzendingen"
        description="Review ingezonden clips, status van metricsverversing, betaalbare views en inkomsten."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Inzendingen" value={String(submissions.length)} detail="Alle ontvangen clips" />
        <StatCard label="In behandeling" value={String(pending)} detail="Review nodig" tone={pending > 0 ? "warning" : "neutral"} />
        <StatCard label="Goedgekeurd" value={String(approved)} detail="Klaar voor uitbetaling" />
        <StatCard label="Issues" value={String(issues)} detail="Afgewezen of gemarkeerd" tone={issues > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Inzendingentabel" description={`${formatCurrencyPrecise(earned, "EUR")} verdiend over goedgekeurde en gevolgde inzendingen.`} />
        <DataTable
          rows={submissions}
          rowKey={(submission) => submission.id}
          emptyState={<EmptyState title="Nog geen inzendingen" description="Creatorinzendingen verschijnen hier nadat campagnewerk start." />}
          columns={[
            { key: "campaign", header: "Campagne", cell: (submission) => submission.campaign.name },
            { key: "creator", header: "Creator", cell: (submission) => submission.creator.email },
            {
              key: "source",
              header: "Bron",
              cell: (submission) => (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">{submission.sourcePlatform?.toLowerCase() ?? "-"}</span>
                  {submission.sourceMethod ? (
                    <Badge variant={submission.sourceMethod === "OAUTH" ? "verified" : "pending"}>
                      {submission.sourceMethod === "OAUTH" ? "Gekoppeld account" : titleCaseEnum(submission.sourceMethod)}
                    </Badge>
                  ) : null}
                  {submission.authorHandle ? <span className="text-xs text-neutral-400">@{submission.authorHandle}</span> : null}
                </div>
              ),
            },
            { key: "submitted", header: "Ingediend", cell: (submission) => formatDate(submission.createdAt) },
            {
              key: "metrics-refresh",
              header: "Laatste metricsverversing",
              cell: (submission) => (
                <div className="text-xs text-neutral-500">
                  <p>{submission.lastMetricsRefreshAt ? formatDate(submission.lastMetricsRefreshAt) : "-"}</p>
                  {submission.metricsRefreshFailures > 0 ? <p className="text-red-600">{submission.metricsRefreshFailures} fout{submission.metricsRefreshFailures === 1 ? "" : "en"}</p> : null}
                </div>
              ),
            },
            { key: "views", header: "Betaalbare views", align: "right", cell: (submission) => submission.eligibleViews?.toLocaleString("nl-NL") ?? "-" },
            { key: "earned", header: "Verdiend", align: "right", cell: (submission) => Number(submission.earnedAmount) > 0 ? formatCurrencyPrecise(submission.earnedAmount, "EUR") : "-" },
            { key: "status", header: "Status", cell: (submission) => <Badge variant={submissionStatusVariant(submission.status)}>{titleCaseEnum(submission.status)}</Badge> },
            {
              key: "actions",
              header: "Acties",
              cell: (submission) => (
                <ProgressiveActionDrawer
                  triggerLabel="Review"
                  title={submission.campaign.name}
                  description="Inzendingsacties"
                  variant="outline"
                  size="sm"
                  showIcon={false}
                >
                  <div className="space-y-4">
                    {submission.postUrl ? (
                      <a
                        href={submission.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                      >Post openen</a>
                    ) : null}
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <SubmissionActions
                        id={submission.id}
                        status={submission.status}
                        postUrl={submission.postUrl}
                      />
                    </div>
                  </div>
                </ProgressiveActionDrawer>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}

function submissionStatusVariant(status: string) {
  if (status === "APPROVED") return "verified";
  if (status === "PENDING") return "pending";
  return "failed";
}
