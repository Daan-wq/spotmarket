import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrencyPrecise, formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { PublishButton } from "./_components/publish-button";
import { CampaignActions } from "./_components/campaign-actions";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      brand: { select: { name: true } },
      createdBy: { select: { email: true } },
      applications: { select: { id: true } },
      campaignSubmissions: { select: { status: true, eligibleViews: true } },
      productionAssignments: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const active = campaigns.filter((campaign) => campaign.status === "active");
  const draft = campaigns.filter((campaign) => ["draft", "pending_payment", "pending_review"].includes(campaign.status));
  const budget = campaigns.reduce((sum, campaign) => sum + Number(campaign.totalBudget), 0);
  const approvedViews = campaigns.reduce(
    (sum, campaign) =>
      sum +
      campaign.campaignSubmissions
        .filter((submission) => submission.status === "APPROVED")
        .reduce((inner, submission) => inner + (submission.eligibleViews ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Campaign Ops"
        title="Campaigns"
        description="Campaigns now sit in the brand-to-production flow. Brand link, assignments, submissions, and publish actions stay visible."
        actions={[{ label: "Create campaign", href: "/admin/campaigns/new", icon: Plus }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Campaigns" value={String(campaigns.length)} detail="All statuses" />
        <StatCard label="Active" value={String(active.length)} detail="Live creator work" />
        <StatCard label="Pipeline" value={String(draft.length)} detail="Draft, payment, review" tone={draft.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Approved views" value={formatNumber(approvedViews)} detail={`${formatCurrencyPrecise(budget)} total budget`} />
      </div>

      <section>
        <SectionHeader title="Campaign Table" description="Dense admin view with brand ownership and production pressure." />
        <DataTable
          rows={campaigns}
          rowKey={(campaign) => campaign.id}
          emptyState={<EmptyState title="No campaigns yet" description="Create the first campaign once a brand is onboarded." primaryCta={{ label: "Create campaign", href: "/admin/campaigns/new" }} />}
          columns={[
            {
              key: "name",
              header: "Campaign",
              cell: (campaign) => (
                <div>
                  <Link href={`/admin/campaigns/${campaign.id}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                    {campaign.name}
                  </Link>
                  <p className="mt-1 text-xs text-neutral-500">{campaign.brand?.name || campaign.createdBy?.email || "No brand linked"}</p>
                </div>
              ),
            },
            { key: "status", header: "Status", cell: (campaign) => <Badge variant={campaign.status === "active" ? "verified" : campaign.status === "cancelled" ? "failed" : "neutral"}>{titleCaseEnum(campaign.status)}</Badge> },
            { key: "budget", header: "Budget", align: "right", cell: (campaign) => formatCurrencyPrecise(campaign.totalBudget, "USD") },
            { key: "creators", header: "Creators", align: "right", cell: (campaign) => campaign.applications.length },
            {
              key: "assignments",
              header: "Assignments",
              align: "right",
              cell: (campaign) => campaign.productionAssignments.filter((assignment) => !["APPROVED", "POSTED", "PAID", "REJECTED"].includes(assignment.status)).length,
            },
            { key: "submissions", header: "Submissions", align: "right", cell: (campaign) => campaign.campaignSubmissions.length },
            { key: "deadline", header: "Deadline", cell: (campaign) => formatDate(campaign.deadline) },
            {
              key: "publish",
              header: "Discord",
              cell: (campaign) => <PublishButton campaignId={campaign.id} />,
            },
            {
              key: "actions",
              header: "Actions",
              cell: (campaign) => (
                <div className="flex items-center gap-2">
                  <Link href={`/admin/campaigns/${campaign.id}/edit`} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                    Edit
                  </Link>
                  <CampaignActions campaignId={campaign.id} status={campaign.status} />
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
