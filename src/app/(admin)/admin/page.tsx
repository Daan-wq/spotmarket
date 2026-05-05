import Link from "next/link";
import { AlertTriangle, BadgeEuro } from "lucide-react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { Plus } from "@/components/animate-ui/icons/plus";
import { ActionQueue, PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getAgencyOsDashboardSnapshot } from "@/lib/admin/agency-os";
import { formatCurrency, formatNumber, toNumber } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const PIPELINE = [
  { label: "Lead", href: "/admin/crm" },
  { label: "Onboarding", href: "/admin/onboarding" },
  { label: "Campaign", href: "/admin/campaigns" },
  { label: "Production", href: "/admin/production" },
  { label: "Clip review", href: "/admin/review" },
  { label: "Payouts", href: "/admin/payouts" },
  { label: "Reports", href: "/admin/reports" },
];

export default async function AdminCommandCenter() {
  const now = new Date();
  const snapshot = await getAgencyOsDashboardSnapshot(now);
  const { metrics } = snapshot;

  const [
    crmFollowUps,
    pipelineValue,
    onboardingBlockers,
    overdueAssignments,
    revisionAssignments,
    pendingQc,
    missingLogo,
    activeBrands,
    activeClippers,
    payoutRuns,
    sopNeedsReview,
    clipsDue,
  ] = await Promise.all([
    prisma.brandLead.count({
      where: {
        convertedBrandId: null,
        stage: { notIn: ["WON", "LOST"] },
        nextFollowUpAt: { lte: now },
      },
    }),
    prisma.brandLead.aggregate({
      where: { convertedBrandId: null, stage: { notIn: ["WON", "LOST"] } },
      _sum: { estimatedValue: true },
    }),
    prisma.brandOnboarding.count({
      where: {
        OR: [
          { contractSigned: false },
          { paymentReceived: false },
          { kickoffCallDone: false },
          { brandBriefReceived: false },
          { contentExamplesReceived: false },
          { driveFolderCreated: false },
          { targetAudience: null },
          { mainProductOrService: null },
          { startDate: null },
        ],
      },
    }),
    prisma.productionAssignment.count({
      where: {
        dueAt: { lt: now },
        status: { notIn: ["APPROVED", "POSTED", "PAID", "REJECTED"] },
      },
    }),
    prisma.productionAssignment.count({ where: { status: "NEEDS_REVISION" } }),
    prisma.campaignSubmission.count({ where: { status: { in: ["PENDING", "FLAGGED", "NEEDS_REVISION"] } } }),
    prisma.campaignSubmission.count({ where: { logoStatus: "MISSING" } }),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
    prisma.clipperOperationalProfile.count({ where: { status: { in: ["APPROVED", "ACTIVE"] } } }),
    prisma.payoutRun.count({ where: { status: { in: ["DRAFT", "FINALIZED", "PROCESSING"] } } }),
    prisma.sopDocument.count({
      where: {
        OR: [
          { status: "NEEDS_REVIEW" },
          { nextReviewAt: { lte: now } },
        ],
      },
    }),
    prisma.productionAssignment.count({
      where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVISION"] } },
    }),
  ]);

  const rawQueue = [
    crmFollowUps > 0
      ? {
          title: `Follow up with ${crmFollowUps} brand lead${crmFollowUps === 1 ? "" : "s"}`,
          detail: "Lead follow-ups are due now. Move the lead, book the call, or keep it warm.",
          href: "/admin/crm",
          label: "Leads",
          tone: "warning" as const,
        }
      : null,
    onboardingBlockers > 0
      ? {
          title: `${onboardingBlockers} onboarding checklist${onboardingBlockers === 1 ? "" : "s"} blocked`,
          detail: "Contract, payment, brief, assets, audience, and assigned clippers must be complete before production.",
          href: "/admin/onboarding",
          label: "Onboarding",
          tone: "warning" as const,
        }
      : null,
    overdueAssignments > 0
      ? {
          title: `${overdueAssignments} overdue production assignment${overdueAssignments === 1 ? "" : "s"}`,
          detail: "Production starts at assigned clip, not after the creator submits. Clear overdue work first.",
          href: "/admin/production",
          label: "Production",
          tone: "danger" as const,
        }
      : null,
    pendingQc > 0
      ? {
          title: `Review ${pendingQc} clip${pendingQc === 1 ? "" : "s"}`,
          detail: `${missingLogo} missing-logo item${missingLogo === 1 ? "" : "s"}, ${revisionAssignments} revision assignment${revisionAssignments === 1 ? "" : "s"}.`,
          href: "/admin/review",
          label: "Review",
          tone: "warning" as const,
        }
      : null,
    payoutRuns > 0 || metrics.payoutsOwed > 0
      ? {
          title: "Close the payout loop",
          detail: `${payoutRuns} payout run${payoutRuns === 1 ? "" : "s"} in progress, ${formatCurrency(metrics.payoutsOwed)} owed from legacy payouts.`,
          href: "/admin/payouts",
          label: "Money",
          tone: "warning" as const,
        }
      : null,
    sopNeedsReview > 0
      ? {
          title: `${sopNeedsReview} guide${sopNeedsReview === 1 ? "" : "s"} need review`,
          detail: "Keep sales, onboarding, recruitment, production, clip review, payouts, and reporting guides current.",
          href: "/admin/sops",
          label: "Guide",
          tone: "neutral" as const,
        }
      : null,
    metrics.openRiskSignals > 0
      ? {
          title: `Resolve ${metrics.openRiskSignals} open risk signal${metrics.openRiskSignals === 1 ? "" : "s"}`,
          detail: `${metrics.criticalRiskSignals} critical, ${metrics.tokenBrokenSignals} token-related. These feed delivery risk.`,
          href: "/admin/signals",
          label: "Risk",
          tone: "danger" as const,
        }
      : null,
  ];
  const queue = rawQueue.filter((item): item is NonNullable<(typeof rawQueue)[number]> => Boolean(item));
  const metricCards = [
    { label: "Revenue", value: formatCurrency(metrics.totalRevenueThisMonth), detail: "Booked this month" },
    { label: "Expected revenue", value: formatCurrency(metrics.expectedRevenueNextMonth), detail: "Campaign deadlines next month" },
    { label: "Active brands", value: String(activeBrands || metrics.activeBrands), detail: `${formatCurrency(toNumber(pipelineValue._sum.estimatedValue))} open pipeline` },
    { label: "Active clippers", value: String(activeClippers || metrics.activeClippers), detail: `${clipsDue} clips due or in progress` },
    { label: "Clip approvals", value: `${metrics.clipsApprovedThisWeek}/${metrics.clipsRejectedOrRevisedThisWeek}`, detail: "Approved / revised this week" },
    { label: "Payouts owed", value: formatCurrency(metrics.payoutsOwed), detail: "Legacy payout obligations", tone: metrics.payoutsOwed > 0 ? "warning" as const : "neutral" as const },
    { label: "Estimated profit", value: formatCurrency(metrics.estimatedGrossProfit), detail: "Booked minus creator cost and open payouts" },
    { label: "Risk", value: `${metrics.openRiskSignals} open`, detail: `${metrics.tokenBrokenSignals} broken token signals`, tone: metrics.openRiskSignals > 0 ? "danger" as const : "neutral" as const },
  ];
  const headlineMetrics = [metricCards[0], metricCards[1], metricCards[2], metricCards[7]];

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Agency OS"
        title="Command Center"
        description="Start here for the next operator move, then open details only when you need them."
        actions={[{ label: "New lead", href: "/admin/crm", icon: Plus }]}
      />

      <section>
        <SectionHeader title="Daily Action Queue" description="Sorted by operational urgency, not by menu order." />
        <ActionQueue
          items={queue.length > 0 ? queue : [{
            title: "No urgent blockers",
            detail: "Use the pipeline strip and weekly numbers to decide the next sales, production, or payout move.",
            href: "/admin/reports",
            label: "Clear",
            tone: "success",
          }]}
        />
      </section>

      <section>
        <SectionHeader
          title="Core numbers"
          description="The first strip stays small; deeper reporting opens from Reports."
          action={<Link href="/admin/reports" className="text-sm font-semibold text-neutral-950 underline">View weekly numbers</Link>}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {headlineMetrics.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Drill-ins" description="Open the specific area when the daily queue points there." />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">Pipeline</h3>
              <ArrowRight className="h-4 w-4 text-neutral-400" animateOnHover />
            </div>
            <div className="space-y-2">
              {PIPELINE.map((step, index) => (
                <Link key={step.href} href={step.href} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950">
                  <span>{index + 1}. {step.label}</span>
                  <span className="text-neutral-400">Open</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-950">Useful areas</h3>
            <div className="space-y-2">
              {snapshot.operatingAreas.slice(0, 6).map((area) => (
                <Link key={area.name} href={area.href ?? "/admin/reports"} className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 transition hover:bg-neutral-100">
                  <span>
                    <span className="block text-sm font-medium text-neutral-950">{area.name}</span>
                    <span className="block text-xs text-neutral-500">{area.detail}</span>
                  </span>
                  <Badge variant={area.status === "live" ? "verified" : "neutral"}>{area.status}</Badge>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-950">Delivery risk</h3>
            <div className="space-y-3">
              {snapshot.deliveryRisks.length === 0 ? (
                <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">No campaign pace risks in the next 7 days.</p>
              ) : (
                snapshot.deliveryRisks.slice(0, 3).map((risk) => (
                  <Link key={risk.id} href={`/admin/campaigns/${risk.id}`} className="block rounded-xl border border-orange-200 bg-white p-3 transition hover:bg-orange-50/40">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{risk.name}</p>
                        <p className="mt-1 text-xs text-neutral-500">{formatNumber(risk.captured)} / {formatNumber(risk.goal)} views captured.</p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                  </Link>
                ))
              )}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                  <BadgeEuro className="h-4 w-4" />
                  Weekly close
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Confirm approved clips, finalize payout runs, then log guide updates before the next reporting cycle.
                </p>
              </div>
              <Link href="/admin/review" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800">
                <ClipboardCheck className="h-4 w-4" animateOnHover />
                Open clip review
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
