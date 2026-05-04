import Link from "next/link";
import { GitPullRequestArrow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { prisma } from "@/lib/prisma";
import { formatDate, isPast, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const now = new Date();
  const assignments = await prisma.productionAssignment.findMany({
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    include: {
      campaign: { select: { id: true, name: true, platform: true } },
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
        eyebrow="Delivery"
        title="Production"
        description="Assignment tracker before final submission: due dates, creator, brand, campaign, content angle, revision state, and overdue filters."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Assignments" value={String(assignments.length)} detail="All assigned clips" />
        <StatCard label="Due work" value={String(due.length)} detail="Not started, in progress, or revision" />
        <StatCard label="Overdue" value={String(overdue.length)} detail="Due before today" tone={overdue.length > 0 ? "danger" : "neutral"} />
        <StatCard label="Submitted" value={String(submitted.length)} detail="Has submission or submitted status" />
      </div>

      <section>
        <SectionHeader
          title="Assignment Table"
          description="Production starts here. A submitted live post is only one later step."
          action={
            <ProgressiveActionDrawer
              triggerLabel="Status board"
              title="Production board"
              description="Use this when you need to see where clips are stuck."
              variant="outline"
              width="lg"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "NEEDS_REVISION", "APPROVED", "POSTED", "REJECTED", "PAID"].map((status) => (
                  <div key={status} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{titleCaseEnum(status)}</p>
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
          emptyState={<EmptyState icon={<GitPullRequestArrow className="h-5 w-5" />} title="No production assignments yet" description="Create assignments from campaigns once brand onboarding is complete." />}
          columns={[
            {
              key: "assignment",
              header: "Assignment",
              cell: (assignment) => (
                <div>
                  <p className="font-semibold text-neutral-950">{assignment.contentAngle || "No angle set"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{assignment.sourceUrl || "No source/reference URL"}</p>
                </div>
              ),
            },
            {
              key: "brand",
              header: "Brand",
              cell: (assignment) => assignment.brand?.name || <span className="text-neutral-400">Unlinked</span>,
            },
            {
              key: "campaign",
              header: "Campaign",
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
              ) : <Badge variant="pending">Unassigned</Badge>,
            },
            {
              key: "due",
              header: "Due",
              cell: (assignment) => (
                <span className={isPast(assignment.dueAt, now) && due.includes(assignment) ? "font-semibold text-red-600" : "text-neutral-600"}>
                  {formatDate(assignment.dueAt)}
                </span>
              ),
            },
            { key: "status", header: "Status", cell: (assignment) => <Badge variant={statusVariant(assignment.status)}>{titleCaseEnum(assignment.status)}</Badge> },
            {
              key: "submission",
              header: "Submission",
              cell: (assignment) => assignment.submission ? (
                <Link href={`/admin/review?submission=${assignment.submission.id}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                  {titleCaseEnum(assignment.submission.status)}
                </Link>
              ) : <span className="text-neutral-400">Not submitted</span>,
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
