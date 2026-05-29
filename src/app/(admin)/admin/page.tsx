import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, BadgeEuro } from "lucide-react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { Plus } from "@/components/animate-ui/icons/plus";
import { ActionQueue, PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getAgencyOsDashboardSnapshot } from "@/lib/admin/agency-os";
import { formatCurrency, formatNumber, toNumber } from "@/lib/admin/agency-format";

export const dynamic = "force-dynamic";

const ADMIN_LOCALE: Locale = "nl";

const PIPELINE = [
  { key: "lead", href: "/admin/crm" },
  { key: "onboarding", href: "/admin/onboarding" },
  { key: "campaign", href: "/admin/campaigns" },
  { key: "production", href: "/admin/production" },
  { key: "review", href: "/admin/review" },
  { key: "payouts", href: "/admin/payouts" },
  { key: "reports", href: "/admin/reports" },
] as const;

const OPERATING_AREA_KEYS: Record<string, string> = {
  "/admin": "commandCenter",
  "/admin/crm": "leads",
  "/admin/onboarding": "brandOnboarding",
  "/admin/clippers": "clipperDatabase",
  "/admin/recruitment": "recruitmentPipeline",
  "/admin/production": "contentProduction",
  "/admin/review": "clipReview",
  "/admin/payouts": "payouts",
  "/admin/pricing": "pricing",
  "/admin/documents": "documents",
  "/admin/sops": "guides",
  "/admin/reports": "weeklyNumbers",
};

export default async function AdminCommandCenter() {
  const t = await getTranslations("dashboard.admin");
  const money = (
    value: number | string | { toString(): string } | null | undefined,
    currency = "EUR",
  ) => formatCurrency(value, currency, ADMIN_LOCALE);
  const number = (value: number | bigint | null | undefined) => formatNumber(value, ADMIN_LOCALE);
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
          title: t("queue.followUps.title", { count: crmFollowUps }),
          detail: t("queue.followUps.detail"),
          href: "/admin/crm",
          label: t("queue.labels.leads"),
          tone: "warning" as const,
        }
      : null,
    onboardingBlockers > 0
      ? {
          title: t("queue.onboarding.title", { count: onboardingBlockers }),
          detail: t("queue.onboarding.detail"),
          href: "/admin/onboarding",
          label: t("queue.labels.onboarding"),
          tone: "warning" as const,
        }
      : null,
    overdueAssignments > 0
      ? {
          title: t("queue.overdue.title", { count: overdueAssignments }),
          detail: t("queue.overdue.detail"),
          href: "/admin/production",
          label: t("queue.labels.production"),
          tone: "danger" as const,
        }
      : null,
    pendingQc > 0
      ? {
          title: t("queue.review.title", { count: pendingQc }),
          detail: t("queue.review.detail", { missingLogo, revisionAssignments }),
          href: "/admin/review",
          label: t("queue.labels.review"),
          tone: "warning" as const,
        }
      : null,
    payoutRuns > 0 || metrics.payoutsOwed > 0
      ? {
          title: t("queue.payout.title"),
          detail: t("queue.payout.detail", {
            payoutRuns,
            amount: money(metrics.payoutsOwed),
          }),
          href: "/admin/payouts",
          label: t("queue.labels.money"),
          tone: "warning" as const,
        }
      : null,
    sopNeedsReview > 0
      ? {
          title: t("queue.guide.title", { count: sopNeedsReview }),
          detail: t("queue.guide.detail"),
          href: "/admin/sops",
          label: t("queue.labels.guide"),
          tone: "neutral" as const,
        }
      : null,
    metrics.openRiskSignals > 0
      ? {
          title: t("queue.risk.title", { count: metrics.openRiskSignals }),
          detail: t("queue.risk.detail", {
            critical: metrics.criticalRiskSignals,
            tokenBroken: metrics.tokenBrokenSignals,
          }),
          href: "/admin/signals",
          label: t("queue.labels.risk"),
          tone: "danger" as const,
        }
      : null,
  ];
  const queue = rawQueue.filter((item): item is NonNullable<(typeof rawQueue)[number]> => Boolean(item));
  const metricCards = [
    {
      label: t("metrics.revenue.label"),
      value: money(metrics.totalRevenueThisMonth),
      detail: t("metrics.revenue.detail"),
    },
    {
      label: t("metrics.expectedRevenue.label"),
      value: money(metrics.expectedRevenueNextMonth),
      detail: t("metrics.expectedRevenue.detail"),
    },
    {
      label: t("metrics.activeBrands.label"),
      value: number(activeBrands || metrics.activeBrands),
      detail: t("metrics.activeBrands.detail", {
        amount: money(toNumber(pipelineValue._sum.estimatedValue)),
      }),
    },
    {
      label: t("metrics.activeClippers.label"),
      value: number(activeClippers || metrics.activeClippers),
      detail: t("metrics.activeClippers.detail", { count: clipsDue }),
    },
    {
      label: t("metrics.clipApprovals.label"),
      value: `${number(metrics.clipsApprovedThisWeek)} / ${number(metrics.clipsRejectedOrRevisedThisWeek)}`,
      detail: t("metrics.clipApprovals.detail"),
    },
    {
      label: t("metrics.payoutsOwed.label"),
      value: money(metrics.payoutsOwed),
      detail: t("metrics.payoutsOwed.detail"),
      tone: metrics.payoutsOwed > 0 ? "warning" as const : "neutral" as const,
    },
    {
      label: t("metrics.estimatedProfit.label"),
      value: money(metrics.estimatedGrossProfit),
      detail: t("metrics.estimatedProfit.detail"),
    },
    {
      label: t("metrics.risk.label"),
      value: t("metrics.risk.value", { count: metrics.openRiskSignals }),
      detail: t("metrics.risk.detail", { count: metrics.tokenBrokenSignals }),
      tone: metrics.openRiskSignals > 0 ? "danger" as const : "neutral" as const,
    },
  ];
  const headlineMetrics = [metricCards[0], metricCards[1], metricCards[2], metricCards[7]];

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        actions={[{ label: t("header.newLead"), href: "/admin/crm", icon: Plus }]}
      />

      <section>
        <SectionHeader
          title={t("sections.actionQueue.title")}
          description={t("sections.actionQueue.description")}
        />
        <ActionQueue
          items={queue.length > 0 ? queue : [{
            title: t("queue.empty.title"),
            detail: t("queue.empty.detail"),
            href: "/admin/reports",
            label: t("queue.labels.clear"),
            tone: "success",
          }]}
        />
      </section>

      <section>
        <SectionHeader
          title={t("sections.coreNumbers.title")}
          description={t("sections.coreNumbers.description")}
          action={
            <Link href="/admin/reports" className="text-sm font-semibold text-neutral-950 underline">
              {t("sections.coreNumbers.action")}
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {headlineMetrics.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title={t("sections.drillIns.title")}
          description={t("sections.drillIns.description")}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">
                {t("drillIns.pipelineTitle")}
              </h3>
              <ArrowRight className="h-4 w-4 text-neutral-400" animateOnHover />
            </div>
            <div className="space-y-2">
              {PIPELINE.map((step, index) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
                >
                  <span>{number(index + 1)}. {t(`pipeline.${step.key}`)}</span>
                  <span className="text-neutral-400">Openen</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-950">
              {t("drillIns.usefulAreasTitle")}
            </h3>
            <div className="space-y-2">
              {snapshot.operatingAreas.slice(0, 6).map((area) => {
                const areaKey = area.href ? OPERATING_AREA_KEYS[area.href] : undefined;
                const areaName = areaKey ? t(`operatingAreas.${areaKey}.name`) : area.name;
                const areaDetail = areaKey ? t(`operatingAreas.${areaKey}.detail`) : area.detail;

                return (
                  <Link
                    key={area.name}
                    href={area.href ?? "/admin/reports"}
                    className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 transition hover:bg-neutral-100"
                  >
                    <span>
                      <span className="block text-sm font-medium text-neutral-950">{areaName}</span>
                      <span className="block text-xs text-neutral-500">{areaDetail}</span>
                    </span>
                    <Badge variant={area.status === "live" ? "verified" : "neutral"}>
                      {area.status === "live" ? "Live" : "Handmatig"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-950">
              {t("drillIns.deliveryRiskTitle")}
            </h3>
            <div className="space-y-3">
              {snapshot.deliveryRisks.length === 0 ? (
                <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">
                  {t("drillIns.noRisk")}
                </p>
              ) : (
                snapshot.deliveryRisks.slice(0, 3).map((risk) => (
                  <Link
                    key={risk.id}
                    href={`/admin/campaigns/${risk.id}`}
                    className="block rounded-xl border border-orange-200 bg-white p-3 transition hover:bg-orange-50/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{risk.name}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {t("drillIns.capturedViews", {
                            captured: number(risk.captured),
                            goal: number(risk.goal),
                          })}
                        </p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                  </Link>
                ))
              )}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                  <BadgeEuro className="h-4 w-4" />
                  {t("drillIns.weeklyClose.title")}
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {t("drillIns.weeklyClose.detail")}
                </p>
              </div>
              <Link
                href="/admin/review"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
              >
                <ClipboardCheck className="h-4 w-4" animateOnHover />
                {t("drillIns.openClipReview")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
