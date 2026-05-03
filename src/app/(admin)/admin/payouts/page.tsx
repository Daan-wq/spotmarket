import { Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrencyPrecise, formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const [runs, payouts, approvedUnpaid] = await Promise.all([
    prisma.payoutRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } },
        },
      },
      take: 50,
    }),
    prisma.payout.findMany({
      include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.campaignSubmission.findMany({
      where: { status: "APPROVED", payoutRunItems: { none: {} } },
      select: { id: true, earnedAmount: true, creator: { select: { email: true } }, campaign: { select: { name: true } } },
      take: 100,
    }),
  ]);

  const openRuns = runs.filter((run) => ["DRAFT", "FINALIZED", "PROCESSING"].includes(run.status));
  const owed = approvedUnpaid.reduce((sum, submission) => sum + Number(submission.earnedAmount), 0);
  const runNet = runs.reduce((sum, run) => sum + Number(run.totalNet), 0);
  const legacyPending = payouts
    .filter((payout) => ["pending", "processing"].includes(payout.status))
    .reduce((sum, payout) => sum + Number(payout.amount), 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Money Ops"
        title="Payouts"
        description="Payout runs group approved unpaid work by creator and period, support bonuses and deductions, export CSV, proof, and paid status."
        actions={[
          { label: "New payout run", href: "/admin/payouts?new=1", icon: Plus },
          { label: "Export CSV", href: "/api/admin/payout-runs?format=csv", icon: Download },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Open runs" value={String(openRuns.length)} detail="Draft, finalized, or processing" />
        <StatCard label="Run net total" value={formatCurrencyPrecise(runNet)} detail="All payout run net amounts" />
        <StatCard label="Approved unpaid" value={formatCurrencyPrecise(owed)} detail={`${approvedUnpaid.length} submissions not in a run`} tone={approvedUnpaid.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Legacy pending" value={formatCurrencyPrecise(legacyPending, "USD")} detail="Existing payout records" tone={legacyPending > 0 ? "warning" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Payout Runs" description="Weekly or period-based grouped payout workflow." />
        <DataTable
          rows={runs}
          rowKey={(run) => run.id}
          emptyState={<EmptyState title="No payout runs yet" description="Create a run from approved unpaid work. The API can group items by creator and period." />}
          columns={[
            {
              key: "run",
              header: "Run",
              cell: (run) => (
                <div>
                  <p className="font-semibold text-neutral-950">{run.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatDate(run.periodStart)} - {formatDate(run.periodEnd)}</p>
                </div>
              ),
            },
            { key: "status", header: "Status", cell: (run) => <Badge variant={run.status === "CONFIRMED" ? "verified" : run.status === "DRAFT" ? "neutral" : "pending"}>{titleCaseEnum(run.status)}</Badge> },
            { key: "items", header: "Items", align: "right", cell: (run) => run.items.length },
            { key: "gross", header: "Gross", align: "right", cell: (run) => formatCurrencyPrecise(run.totalGross, run.currency) },
            { key: "bonus", header: "Bonus", align: "right", cell: (run) => formatCurrencyPrecise(run.totalBonus, run.currency) },
            { key: "deduction", header: "Deductions", align: "right", cell: (run) => formatCurrencyPrecise(run.totalDeduction, run.currency) },
            { key: "net", header: "Net", align: "right", cell: (run) => <span className="font-semibold text-neutral-950">{formatCurrencyPrecise(run.totalNet, run.currency)}</span> },
            { key: "proof", header: "Proof", cell: (run) => run.proofUrl ? <a href={run.proofUrl} className="font-semibold underline underline-offset-2">Open</a> : "-" },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Approved Unpaid Work" description="Source material for the next payout run." />
        <DataTable
          rows={approvedUnpaid}
          rowKey={(submission) => submission.id}
          emptyState={<EmptyState title="No approved unpaid submissions" description="All approved work is either already in a payout run or no approved work exists." />}
          columns={[
            { key: "campaign", header: "Campaign", cell: (submission) => submission.campaign.name },
            { key: "creator", header: "Creator", cell: (submission) => submission.creator.email },
            { key: "amount", header: "Amount", align: "right", cell: (submission) => formatCurrencyPrecise(submission.earnedAmount, "USD") },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Legacy Payout Records" description="Existing payout history remains visible while payout runs become the operator workflow." />
        <DataTable
          rows={payouts}
          rowKey={(payout) => payout.id}
          emptyState={<EmptyState title="No payouts yet" description="Creator payout records will appear here after processing." />}
          columns={[
            { key: "creator", header: "Creator", cell: (payout) => payout.creatorProfile?.displayName || payout.creatorProfile?.user?.email || "-" },
            { key: "amount", header: "Amount", align: "right", cell: (payout) => formatCurrencyPrecise(payout.amount, payout.currency) },
            { key: "status", header: "Status", cell: (payout) => <Badge variant={payout.status === "confirmed" || payout.status === "sent" ? "verified" : payout.status === "failed" ? "failed" : "pending"}>{titleCaseEnum(payout.status)}</Badge> },
            { key: "method", header: "Method", cell: (payout) => payout.paymentMethod || "-" },
            { key: "date", header: "Date", cell: (payout) => formatDate(payout.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
