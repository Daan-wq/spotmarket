import Link from "next/link";
import { AlertTriangle, BadgeEuro } from "lucide-react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { Plus } from "@/components/animate-ui/icons/plus";
import { ActionQueue, PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { prisma } from "@/lib/prisma";
import { getAgencyOsDashboardSnapshot } from "@/lib/admin/agency-os";
import { formatCurrency, formatNumber, toNumber } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const PIPELINE = [
  { label: "Lead", href: "/admin/crm" },
  { label: "Onboarding", href: "/admin/onboarding" },
  { label: "Campaign", href: "/admin/campaigns" },
  { label: "Production", href: "/admin/production" },
  { label: "QC", href: "/admin/review" },
  { label: "Payout", href: "/admin/payouts" },
  { label: "Report", href: "/admin/reports" },
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
          detail: "CRM follow-ups are due now. Move the lead, book the call, or nurture it cleanly.",
          href: "/admin/crm",
          label: "CRM",
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
          label: "QC",
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
          title: `${sopNeedsReview} SOP${sopNeedsReview === 1 ? "" : "s"} need review`,
          detail: "Keep sales, onboarding, recruitment, production, QC, payouts, and reporting procedures current.",
          href: "/admin/sops",
          label: "SOP",
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
    { label: "QC approvals", value: `${metrics.clipsApprovedThisWeek}/${metrics.clipsRejectedOrRevisedThisWeek}`, detail: "Approved / rejected this week" },
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
            detail: "Use the pipeline strip and KPI reporting to decide the next sales, production, or payout move.",
            href: "/admin/reports",
            label: "Clear",
            tone: "success",
          }]}
        />
      </section>

      <section>
        <SectionHeader
          title="Core numbers"
          description="The first strip stays small; deeper reporting opens on demand."
          action={
            <ProgressiveActionDrawer
              triggerLabel="View all KPIs"
              title="CEO KPI reporting"
              description="Money, delivery, staffing, quality, payout, and risk."
              variant="outline"
              width="lg"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {metricCards.map((card) => (
                  <StatCard key={card.label} {...card} />
                ))}
              </div>
            </ProgressiveActionDrawer>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {headlineMetrics.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Details" description="Open these when the daily queue points there." />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ProgressiveActionDrawer
            triggerLabel="Open pipeline"
            title="Pipeline visibility"
            description="Compact clipping flow from sales to weekly reporting."
            variant="outline"
            width="lg"
            className="w-full justify-between"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PIPELINE.map((step, index) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="group rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      Step {index + 1}
                    </span>
                    <ArrowRight className="h-4 w-4 text-neutral-300 transition group-hover:text-neutral-950" animateOnHover />
                  </div>
                  <p className="mt-4 text-base font-semibold text-neutral-950">{step.label}</p>
                </Link>
              ))}
            </div>
          </ProgressiveActionDrawer>

          <ProgressiveActionDrawer
            triggerLabel="Module status"
            title="Module status"
            description="Live modules and the current operating surface."
            variant="outline"
            width="lg"
            className="w-full justify-between"
          >
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="divide-y divide-neutral-100">
                {snapshot.operatingAreas.map((area) => (
                  <Link key={area.name} href={area.href ?? "/admin/sops"} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-neutral-50">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{area.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">{area.detail}</p>
                    </div>
                    <Badge variant={area.status === "live" ? "verified" : "neutral"}>{area.status}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </ProgressiveActionDrawer>

          <ProgressiveActionDrawer
            triggerLabel="Delivery risk"
            title="Delivery risk"
            description="Campaign pace risks and the weekly close."
            variant="outline"
            width="lg"
            badgeLabel={snapshot.deliveryRisks.length > 0 ? String(snapshot.deliveryRisks.length) : undefined}
            className="w-full justify-between"
          >
            <div className="space-y-3">
              {snapshot.deliveryRisks.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
                  No campaign pace risks in the next 7 days.
                </div>
              ) : (
                snapshot.deliveryRisks.map((risk) => (
                  <Link key={risk.id} href={`/admin/campaigns/${risk.id}`} className="block rounded-2xl border border-orange-200 bg-white p-4 transition hover:bg-orange-50/40">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{risk.name}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatNumber(risk.captured)} / {formatNumber(risk.goal)} views captured.
                        </p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                  </Link>
                ))
              )}

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                  <BadgeEuro className="h-4 w-4" />
                  Weekly close
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Confirm approved clips, finalize payout runs, then log SOP updates before the next reporting cycle.
                </p>
              </div>

              <Link
                href="/admin/review"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
              >
                <ClipboardCheck className="h-4 w-4" animateOnHover />
                Open QC workbench
              </Link>
            </div>
          </ProgressiveActionDrawer>
        </div>
      </section>
    </div>
  );
}
