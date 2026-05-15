import { Gauge } from "@/components/animate-ui/icons/gauge";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { getAgencyOsDashboardSnapshot } from "@/lib/admin/agency-os";
import { formatCurrency, formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { prisma } from "@/lib/prisma";
import { WeeklySnapshotForm } from "./weekly-snapshot-form";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const snapshot = await getAgencyOsDashboardSnapshot();
  const [brands, payoutRuns, recentReviews, weeklySnapshots] = await Promise.all([
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
    prisma.weeklyBusinessSnapshot.findMany({ orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }], take: 12 }),
  ]);

  const { metrics } = snapshot;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Admin"
        title="Reports"
        description="Saved weekly numbers, brand delivery, clip review, payouts, and guide upkeep in one place."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Booked budget" value={formatCurrency(metrics.bookedCampaignBudget)} detail="Non-cancelled campaigns" />
        <StatCard label="Creator earnings" value={formatCurrency(metrics.creatorEarnings)} detail="Approved submission earnings" />
        <StatCard label="Approval rate" value={metrics.approvalRate == null ? "-" : `${metrics.approvalRate.toFixed(0)}%`} detail="Approved vs revised this week" />
        <StatCard label="Open risk" value={String(metrics.openRiskSignals)} detail={`${metrics.criticalRiskSignals} critical`} tone={metrics.openRiskSignals > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Save weekly numbers" description="Store today’s live numbers as a weekly review snapshot for history." />
        <WeeklySnapshotForm />
      </section>

      <section>
        <SectionHeader title="Weekly history" description="Snapshots stay fixed so the team can compare weeks instead of only seeing live dashboard numbers." />
        <DataTable
          rows={weeklySnapshots}
          rowKey={(row) => row.id}
          emptyState={<EmptyState title="No weekly snapshots yet" description="Save the current week above to start history." />}
          columns={[
            { key: "week", header: "Week", cell: (row) => `${formatDate(row.weekStart)} - ${formatDate(row.weekEnd)}` },
            { key: "revenue", header: "Booked", align: "right", cell: (row) => formatCurrency(row.revenueBooked) },
            { key: "profit", header: "Est. profit", align: "right", cell: (row) => formatCurrency(row.estimatedProfit) },
            { key: "clips", header: "Clips", align: "right", cell: (row) => formatNumber(row.clipsDelivered) },
            { key: "approved", header: "Approved", align: "right", cell: (row) => formatNumber(row.clipsApproved) },
            { key: "risk", header: "Open risks", align: "right", cell: (row) => formatNumber(row.openRisks) },
            { key: "notes", header: "Notes", cell: (row) => row.notes || "-" },
          ]}
        />
      </section>

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
          <SectionHeader title="Recent clip reviews" />
          <DataTable
            rows={recentReviews}
            rowKey={(review) => review.id}
            emptyState={<EmptyState title="No clip reviews recorded yet" description="Review decisions will appear here once scorecards are saved." />}
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
