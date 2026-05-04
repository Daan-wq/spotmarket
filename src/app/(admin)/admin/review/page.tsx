import Link from "next/link";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { LogoReviewWidget } from "@/components/admin/logo-review-widget";
import SubmissionActions from "../submissions/_components/submission-actions";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const SCORECARD = [
  "Logo",
  "Hook",
  "Pacing",
  "Captions",
  "Brand fit",
  "Spelling",
  "9:16 format",
  "Audio",
  "CTA",
];

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
      qcReviews: { orderBy: { createdAt: "desc" }, take: 1 },
      submissionSignals: { where: { resolvedAt: null }, select: { id: true, type: true, severity: true } },
    },
    take: 80,
  });

  const logoMissing = submissions.filter((submission) => submission.logoStatus === "MISSING").length;
  const revisions = submissions.filter((submission) => submission.status === "NEEDS_REVISION").length;
  const flagged = submissions.filter((submission) => submission.status === "FLAGGED").length;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Quality Control"
        title="Review"
        description="QC workbench for logo, hook, pacing, captions, brand fit, spelling, format, audio, CTA, notes, and decision."
        actions={[{ label: "Legacy logo queue", href: "/admin/review/videos", icon: ClipboardCheck }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Needs QC" value={String(submissions.length)} detail="Pending, flagged, or revision" tone={submissions.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Missing logo" value={String(logoMissing)} detail="Logo currently marked missing" tone={logoMissing > 0 ? "danger" : "neutral"} />
        <StatCard label="Revision needed" value={String(revisions)} detail="Creator should revise before approval" tone={revisions > 0 ? "warning" : "neutral"} />
        <StatCard label="Flagged" value={String(flagged)} detail="Risk or tracking issue" tone={flagged > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader
          title="QC Queue"
          description="Approve, reject, or send revision after the scorecard is recorded."
          action={
            <ProgressiveActionDrawer
              triggerLabel="Scorecard fields"
              title="QC scorecard fields"
              description="Use these checks before recording a final decision."
              variant="outline"
              width="lg"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SCORECARD.map((field) => (
                  <div key={field} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold text-neutral-950">
                    {field}
                  </div>
                ))}
              </div>
            </ProgressiveActionDrawer>
          }
        />
        {submissions.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="QC queue clear"
            description="No pending, flagged, or revision-needed clips. Keep production moving from the Production page."
            primaryCta={{ label: "Open production", href: "/admin/production" }}
          />
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const latestReview = submission.qcReviews[0] ?? null;
              const canApprove = submission.logoStatus === "PRESENT";
              return (
                <article key={submission.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Link href={`/admin/campaigns/${submission.campaign.id}`} className="text-base font-semibold text-neutral-950 underline-offset-2 hover:underline">
                        {submission.campaign.name}
                      </Link>
                      <p className="mt-1 text-xs text-neutral-500">
                        {submission.campaign.brand?.name || "Unlinked brand"} · {submission.creator.email} · submitted {formatDate(submission.createdAt)}
                      </p>
                      {submission.productionAssignment ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          Assignment: {submission.productionAssignment.contentAngle || "No angle"} · due {formatDate(submission.productionAssignment.dueAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={submission.status === "FLAGGED" ? "failed" : submission.status === "NEEDS_REVISION" ? "pending" : "neutral"}>
                        {titleCaseEnum(submission.status)}
                      </Badge>
                      <Badge variant={submission.logoStatus === "PRESENT" ? "verified" : submission.logoStatus === "MISSING" ? "failed" : "pending"}>
                        Logo {titleCaseEnum(submission.logoStatus ?? "PENDING")}
                      </Badge>
                    </div>
                  </header>

                  {submission.submissionSignals.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {submission.submissionSignals.map((signal) => (
                        <Badge key={signal.id} variant={signal.severity === "CRITICAL" ? "failed" : "pending"}>
                          {titleCaseEnum(signal.type)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
                    <LogoReviewWidget
                      submissionId={submission.id}
                      thumbnailUrl={submission.screenshotUrl}
                      postUrl={submission.postUrl}
                      initialStatus={(submission.logoStatus ?? "PENDING") as "PENDING" | "PRESENT" | "MISSING"}
                      initialVerifiedAt={submission.logoVerifiedAt?.toISOString() ?? null}
                      initialVerifiedBy={submission.logoVerifiedBy}
                    />

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Latest scorecard</p>
                      {latestReview ? (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-600">
                          <Score label="Hook" value={latestReview.hookScore} />
                          <Score label="Pacing" value={latestReview.pacingScore} />
                          <Score label="Captions" value={latestReview.captionsScore} />
                          <Score label="Brand fit" value={latestReview.brandFitScore} />
                          <Score label="Logo" value={latestReview.logoPresent ? "Present" : "Missing"} />
                          <Score label="Decision" value={titleCaseEnum(latestReview.decision)} />
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-neutral-500">
                          No QC review recorded yet. Use the QC API to record scores, notes, and decision.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a
                          href={submission.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-100"
                        >
                          <ExternalLink className="h-4 w-4" animateOnHover />
                          Open post
                        </a>
                        {canApprove ? (
                          <SubmissionActions id={submission.id} status={submission.status} postUrl={submission.postUrl} />
                        ) : (
                          <p className="text-xs text-neutral-500">Approval unlocks after logo is marked present.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 font-semibold text-neutral-950">{value ?? "-"}</p>
    </div>
  );
}
