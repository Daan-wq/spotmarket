import Link from "next/link";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import SubmissionActions from "../submissions/_components/submission-actions";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const submissions = await prisma.campaignSubmission.findMany({
    where: { status: { in: ["PENDING", "FLAGGED", "NEEDS_REVISION"] } },
    orderBy: { createdAt: "asc" },
    include: {
      campaign: { select: { id: true, name: true, brand: { select: { name: true } } } },
      creator: { select: { id: true, email: true } },
      productionAssignment: {
        select: {
          id: true,
          contentAngle: true,
          dueAt: true,
          creatorProfile: { select: { displayName: true } },
        },
      },
    },
    take: 80,
  });

  const revisions = submissions.filter((submission) => submission.status === "NEEDS_REVISION").length;
  const flagged = submissions.filter((submission) => submission.status === "FLAGGED").length;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Clip review"
        title="Clip review"
        description="Open each submitted post, then approve or reject. Rejections require a reason."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Needs review" value={String(submissions.length)} detail="Pending, flagged, or revision" tone={submissions.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Revision needed" value={String(revisions)} detail="Creator should revise before approval" tone={revisions > 0 ? "warning" : "neutral"} />
        <StatCard label="Flagged" value={String(flagged)} detail="Risk or tracking issue" tone={flagged > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader
          title="Review queue"
          description="Open the post, then make the final call."
        />
        {submissions.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Review queue clear"
            description="No pending, flagged, or revision-needed clips. Keep production moving from the Production page."
            primaryCta={{ label: "Open production", href: "/admin/production" }}
          />
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <article key={submission.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link href={`/admin/campaigns/${submission.campaign.id}`} className="text-base font-semibold text-neutral-950 underline-offset-2 hover:underline">
                      {submission.campaign.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {submission.campaign.brand?.name || "Unlinked brand"} - {submission.creator.email} - submitted {formatDate(submission.createdAt)}
                    </p>
                    {submission.productionAssignment ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        Assignment: {submission.productionAssignment.contentAngle || "No angle"} - due {formatDate(submission.productionAssignment.dueAt)}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={submission.status === "FLAGGED" ? "failed" : submission.status === "NEEDS_REVISION" ? "pending" : "neutral"}>
                    {titleCaseEnum(submission.status)}
                  </Badge>
                </header>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <a
                    href={submission.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                  >
                    <ExternalLink className="h-4 w-4" animateOnHover />
                    Open post
                  </a>
                  <SubmissionActions
                    id={submission.id}
                    status={submission.status}
                    postUrl={submission.postUrl}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
