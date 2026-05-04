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
        eyebrow="Submissions"
        title="Submissions"
        description="Review submitted clips, scrape status, eligible views, and earnings."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Submissions" value={String(submissions.length)} detail="All received clips" />
        <StatCard label="Pending" value={String(pending)} detail="Need review" tone={pending > 0 ? "warning" : "neutral"} />
        <StatCard label="Approved" value={String(approved)} detail="Eligible for payout" />
        <StatCard label="Issues" value={String(issues)} detail="Rejected or flagged" tone={issues > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Submission Table" description={`${formatCurrencyPrecise(earned, "USD")} earned across approved and tracked submissions.`} />
        <DataTable
          rows={submissions}
          rowKey={(submission) => submission.id}
          emptyState={<EmptyState title="No submissions yet" description="Creator submissions will appear here after campaign work starts." />}
          columns={[
            { key: "campaign", header: "Campaign", cell: (submission) => submission.campaign.name },
            { key: "creator", header: "Creator", cell: (submission) => submission.creator.email },
            {
              key: "source",
              header: "Source",
              cell: (submission) => (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">{submission.sourcePlatform?.toLowerCase() ?? "-"}</span>
                  {submission.sourceMethod ? <Badge variant={submission.sourceMethod === "OAUTH" ? "verified" : "pending"}>{titleCaseEnum(submission.sourceMethod)}</Badge> : null}
                  {submission.authorHandle ? <span className="text-xs text-neutral-400">@{submission.authorHandle}</span> : null}
                </div>
              ),
            },
            { key: "submitted", header: "Submitted", cell: (submission) => formatDate(submission.createdAt) },
            {
              key: "scrape",
              header: "Last scrape",
              cell: (submission) => (
                <div className="text-xs text-neutral-500">
                  <p>{submission.lastScrapedAt ? formatDate(submission.lastScrapedAt) : "-"}</p>
                  {submission.scrapeFailures > 0 ? <p className="text-red-600">{submission.scrapeFailures} failure{submission.scrapeFailures === 1 ? "" : "s"}</p> : null}
                </div>
              ),
            },
            { key: "views", header: "Eligible views", align: "right", cell: (submission) => submission.eligibleViews?.toLocaleString() ?? "-" },
            { key: "earned", header: "Earned", align: "right", cell: (submission) => Number(submission.earnedAmount) > 0 ? formatCurrencyPrecise(submission.earnedAmount, "USD") : "-" },
            { key: "status", header: "Status", cell: (submission) => <Badge variant={submissionStatusVariant(submission.status)}>{titleCaseEnum(submission.status)}</Badge> },
            {
              key: "actions",
              header: "Actions",
              cell: (submission) => (
                <ProgressiveActionDrawer
                  triggerLabel="Review"
                  title={submission.campaign.name}
                  description="Submission actions"
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
                      >
                        Open post
                      </a>
                    ) : null}
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <SubmissionActions id={submission.id} status={submission.status} postUrl={submission.postUrl} />
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
