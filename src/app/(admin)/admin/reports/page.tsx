import { Gauge } from "@/components/animate-ui/icons/gauge";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { getAgencyOsDashboardSnapshot } from "@/lib/admin/agency-os";
import { formatCurrency, formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const snapshot = await getAgencyOsDashboardSnapshot();
  const [brands, payoutRuns, recentReviews] = await Promise.all([
    prisma.brand.findMany({
      where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            campaignSubmissions: {
              where: { status: "APPROVED" },
              select: { eligibleViews: true, earnedAmount: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.payoutRun.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { items: true } }),
    prisma.qcReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { submission: { select: { campaign: { select: { name: true } }, creator: { select: { email: true } } } } },
    }),
  ]);

  const { metrics } = snapshot;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="CEO View"
        title="Reports"
        description="Weekly KPI review surface for revenue, delivery, quality, payouts, brand performance, and SOP hygiene."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Booked budget" value={formatCurrency(metrics.bookedCampaignBudget)} detail="Non-cancelled campaigns" />
        <StatCard label="Creator earnings" value={formatCurrency(metrics.creatorEarnings)} detail="Approved submission earnings" />
        <StatCard label="Approval rate" value={metrics.approvalRate == null ? "-" : `${metrics.approvalRate.toFixed(0)}%`} detail="Approved vs rejected this week" />
        <StatCard label="Open risk" value={String(metrics.openRiskSignals)} detail={`${metrics.criticalRiskSignals} critical`} tone={metrics.openRiskSignals > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Brand Delivery Report" description="Approved views and creator cost grouped by brand campaigns." />
        <DataTable
          rows={brands}
          rowKey={(brand) => brand.id}
          emptyState={<EmptyState icon={<Gauge className="h-5 w-5" />} title="No active brand reports yet" description="Active or onboarding brands will appear here once they have campaigns." />}
          columns={[
            { key: "brand", header: "Brand", cell: (brand) => <span className="font-semibold text-neutral-950">{brand.name}</span> },
            { key: "status", header: "Status", cell: (brand) => <Badge variant={brand.status === "ACTIVE" ? "verified" : "pending"}>{titleCaseEnum(brand.status)}</Badge> },
            { key: "campaigns", header: "Campaigns", align: "right", cell: (brand) => brand.campaigns.length },
            {
              key: "views",
              header: "Approved views",
              align: "right",
              cell: (brand) => formatNumber(brand.campaigns.flatMap((campaign) => campaign.campaignSubmissions).reduce((sum, submission) => sum + (submission.eligibleViews ?? 0), 0)),
            },
            {
              key: "cost",
              header: "Creator cost",
              align: "right",
              cell: (brand) => formatCurrency(brand.campaigns.flatMap((campaign) => campaign.campaignSubmissions).reduce((sum, submission) => sum + Number(submission.earnedAmount), 0), brand.currency),
            },
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div>
          <SectionHeader title="Recent QC Reviews" />
          <DataTable
            rows={recentReviews}
            rowKey={(review) => review.id}
            emptyState={<EmptyState title="No QC reviews recorded yet" description="QC decisions will appear here once scorecards are saved." />}
            columns={[
              { key: "campaign", header: "Campaign", cell: (review) => review.submission.campaign.name },
              { key: "creator", header: "Creator", cell: (review) => review.submission.creator.email },
              { key: "decision", header: "Decision", cell: (review) => <Badge variant={review.decision === "APPROVED" ? "verified" : review.decision === "REJECTED" ? "failed" : "pending"}>{titleCaseEnum(review.decision)}</Badge> },
              { key: "date", header: "Date", cell: (review) => formatDate(review.createdAt) },
            ]}
          />
        </div>
        <div>
          <SectionHeader title="Payout Runs" />
          <DataTable
            rows={payoutRuns}
            rowKey={(run) => run.id}
            emptyState={<EmptyState title="No payout runs yet" description="Payout run reports appear after a weekly run is created." />}
            columns={[
              { key: "name", header: "Run", cell: (run) => <span className="font-semibold text-neutral-950">{run.name}</span> },
              { key: "status", header: "Status", cell: (run) => <Badge variant={run.status === "CONFIRMED" ? "verified" : "pending"}>{titleCaseEnum(run.status)}</Badge> },
              { key: "items", header: "Items", align: "right", cell: (run) => run.items.length },
              { key: "total", header: "Net", align: "right", cell: (run) => formatCurrency(run.totalNet, run.currency) },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
