import type { ReactNode } from "react";
import { BarChart3, ExternalLink, FileText, ShieldCheck, Sparkles, Target, Users, Wallet } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/admin/agency-format";
import { normalizeTextList, type CampaignReportEditorial } from "@/lib/admin/campaign-report-shared";
import {
  audienceBarWidth,
  formatAudienceCountryLabel,
  formatAudienceShare,
  renderCampaignReportTemplate,
  reportQualityStatusLabel,
} from "@/lib/admin/campaign-report-display";
import type { BrandReportLiveData } from "@/lib/brand-report-portal";

interface BrandReportDocumentProps {
  report: {
    title: string;
    updatedAt: Date | string;
    brandVisibleAt: Date | string | null;
    executiveSummary: string;
    keyTakeaways: unknown;
    learnings: unknown;
    nextCampaignRecommendations: unknown;
  };
  data: BrandReportLiveData;
  editorial: CampaignReportEditorial;
}

export function BrandReportDocument({ report, data, editorial }: BrandReportDocumentProps) {
  const blocks = editorial.editorialContent.templateBlocks;
  const sections = editorial.sectionSettings;
  const copy = (key: string, fallback: string) => renderCampaignReportTemplate(
    blocks[key] ?? fallback,
    data,
    { mode: "live" },
  );
  const recommendations = normalizeTextList(report.nextCampaignRecommendations);
  const learnings = normalizeTextList(report.learnings);
  const keyTakeaways = normalizeTextList(report.keyTakeaways);
  const paidViews = data.performance.targetViews
    ? Math.min(data.performance.currentViews, data.performance.targetViews)
    : data.performance.paidEligibleViews;

  return (
      <article className="report-print-root bg-[#efede8] px-0 py-5 sm:px-6" style={{ fontFamily: "var(--font-report), var(--font-sans)" }}>
        <div className="mx-auto w-full max-w-[210mm] space-y-5">
          {sections.cover ? <ReportSection className="flex items-center bg-white text-neutral-950">
            <div className="w-full">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                {copy("cover.kicker", "Campagne prestatierapport")}
              </p>
              <h1 className="mt-8 max-w-5xl text-6xl font-black leading-[0.98] tracking-normal text-neutral-950 md:text-8xl">{report.title}</h1>
            </div>
          </ReportSection> : null}

          {sections.executiveSummary ? <ReportSection>
            <SectionHeader
              kicker={copy("section.summary.kicker", "Samenvatting")}
              title={copy("section.summary.title", "Resultaat in een oogopslag")}
              icon={<FileText className="h-5 w-5" />}
            />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div>
                <p className="text-5xl font-semibold leading-none tracking-normal text-neutral-950 md:text-7xl">
                  {copy(
                    data.performance.deliveryProgress == null ? "summary.heroHeadline.noGoal" : "summary.heroHeadline",
                    data.performance.deliveryProgress == null ? "Campagneprestatie" : "{{performance.deliveryProgress}} van doel",
                  )}
                </p>
                <p className="mt-6 max-w-4xl text-lg leading-8 text-neutral-800">
                  {renderCampaignReportTemplate(blocks["summary.body"] || report.executiveSummary, data, { mode: "live" })}
                </p>
                {keyTakeaways.length > 0 ? (
                  <div className="mt-6 grid gap-2">
                    {keyTakeaways.slice(0, 4).map((takeaway) => (
                      <p key={takeaway} className="rounded-lg bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-800">{takeaway}</p>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3">
                <HeroMetric label={copy("summary.metric.totalViews.label", "Totale views")} value={formatNumber(data.performance.currentViews, "nl")} />
                <HeroMetric label={copy("summary.metric.targetViews.label", "Doelviews")} value={data.performance.targetViews ? formatNumber(data.performance.targetViews, "nl") : "-"} />
                <HeroMetric label={copy("summary.metric.extraReach.label", "Extra bereik")} value={formatNumber(data.performance.overdeliveryViews, "nl")} accent={data.performance.overdeliveryViews > 0} />
                <HeroMetric label={copy("summary.metric.approvedClips.label", "Goedgekeurde clips")} value={formatNumber(data.performance.approvedClips, "nl")} />
              </div>
            </div>
          </ReportSection> : null}

          {sections.campaignAtAGlance ? <ReportSection>
            <SectionHeader
              kicker={copy("section.glance.kicker", "Campagne in het kort")}
              title={copy("section.glance.title", "Doel, bereik en overdelivery")}
              icon={<Target className="h-5 w-5" />}
            />
            <DeliveryProgress
              currentViews={data.performance.currentViews}
              targetViews={data.performance.targetViews}
              currentLabel={copy("glance.progress.currentLabel", "Voortgang naar doel")}
              targetLabel={copy("glance.progress.targetLabel", "Doelviews")}
              extraReachLabel={copy("glance.progress.extraReachLabel", "extra bereik")}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatTile label={copy("glance.metric.paidViews.label", "Betaalde views")} value={formatNumber(paidViews, "nl")} helper={copy("glance.metric.paidViews.helper", "Gemaximeerd op het afgesproken doel")} />
              <StatTile label={copy("glance.metric.extraReach.label", "Extra bereik")} value={formatNumber(data.performance.overdeliveryViews, "nl")} helper={copy("glance.metric.extraReach.helper", "Views boven doel zonder extra budget")} />
              <StatTile label={copy("glance.metric.budgetUsed.label", "Budget gebruikt")} value={formatCurrency(data.performance.budgetUsed, "EUR", "nl")} helper={formatPercent(data.performance.budgetUsedPercent)} />
              <StatTile label={copy("summary.metric.effectiveCpm.label", "Effectieve CPM")} value={formatCurrency(data.performance.costPerThousandViews ?? 0, "EUR", "nl")} helper={copy("budget.metric.effectiveCpmTotal.helper", "Gebaseerd op totale views")} />
            </div>
          </ReportSection> : null}

          {sections.campaignPerformance ? <ReportSection>
            <SectionHeader
              kicker={copy("section.performance.kicker", "Campagneprestatie")}
              title={copy("section.performance.title", "Groei van de campagne")}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <CumulativeViewsChart
              rows={data.timeline}
              currentViews={data.performance.currentViews}
              targetViews={data.performance.targetViews}
            />
            <p className="mt-6 border-l-4 border-neutral-950 bg-neutral-50 px-5 py-4 text-sm leading-6 text-neutral-700">
              {copy("performance.insight", "De cumulatieve viewlijn laat zien wanneer de campagne tractie kreeg en performance versnelde.")}
            </p>
          </ReportSection> : null}

          {sections.contentPerformance && data.topContent.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker={copy("section.content.kicker", "Contentprestaties")} title={copy("section.content.title", "Topclips en winnende patronen")} icon={<Sparkles className="h-5 w-5" />} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.topContent.slice(0, 6).map((row, index) => (
                  <article key={row.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div className="aspect-video bg-neutral-100">
                      {row.thumbnailUrl ? <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-neutral-400">#{index + 1} / {row.platform}</p>
                          <h3 className="mt-1 text-lg font-semibold text-neutral-950">{row.creator}</h3>
                        </div>
                        <a href={row.postUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-950 hover:text-white" aria-label="Bekijk video">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <StatText label={copy("content.card.viewsLabel", "Views")} value={formatNumber(row.views, "nl")} />
                        <StatText label={copy("content.card.engagementLabel", "Engagement")} value={formatNumber(row.engagement, "nl")} />
                      </div>
                      <p className="mt-5 text-sm leading-6 text-neutral-700">
                        {copy(`topContent.${row.id}.note`, "Werkte door een snelle hook, duidelijke merkherkenning en een platform-native editstijl.")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {sections.platformPerformance && data.platformBreakdown.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker={copy("section.platform.kicker", "Platformprestaties")} title={copy("section.platform.title", "Kanaalvergelijking")} icon={<BarChart3 className="h-5 w-5" />} />
              <div className="grid gap-3">
                {data.platformBreakdown.map((row) => (
                  <div key={row.platform} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-neutral-950">{row.platform}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {row.clips} {copy("platform.row.approvedClipsLabel", "goedgekeurde clips")} / {formatPercent(row.engagementRate)} {copy("platform.row.engagementRateLabel", "engagementpercentage")}
                        </p>
                      </div>
                      <p className="text-2xl font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {sections.creatorContribution && data.creators.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker={copy("section.creator.kicker", "Creatorbijdrage")} title={copy("section.creator.title", "Bijdrage van creators")} icon={<Users className="h-5 w-5" />} />
              <div className="grid gap-3">
                {data.creators.slice(0, 8).map((row) => (
                  <div key={row.creator} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-[180px_minmax(0,1fr)_140px] md:items-center">
                    <div>
                      <p className="font-semibold text-neutral-950">{row.creator}</p>
                      <p className="text-sm text-neutral-500">{row.approvedSubmissions}/{row.submissions} {copy("creator.row.clipsApprovedLabel", "clips goedgekeurd")}</p>
                    </div>
                    <Progress value={row.views} max={Math.max(1, ...data.creators.map((creator) => creator.views))} />
                    <p className="text-right font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {sections.audienceReach && data.audience.sampleCount > 0 ? (
            <ReportSection>
              <SectionHeader kicker={copy("section.audience.kicker", "Publiek en bereik")} title={copy("section.audience.title", "Bereikt publiek")} icon={<Users className="h-5 w-5" />} />
              <div className="grid gap-4 lg:grid-cols-3">
                <Distribution title={copy("audience.distribution.countries.title", "Top landen")} rows={data.audience.topCountries.slice(0, 5).map((row) => ({ label: formatAudienceCountryLabel(row.code), value: row.share }))} />
                <Distribution title={copy("audience.distribution.age.title", "Leeftijd")} rows={Object.entries(data.audience.ageBuckets).map(([label, value]) => ({ label, value }))} />
                <Distribution title={copy("audience.distribution.gender.title", "Gender")} rows={Object.entries(data.audience.genderSplit).map(([label, value]) => ({ label, value }))} />
              </div>
              <p className="mt-6 border-l-4 border-neutral-950 bg-neutral-50 px-5 py-4 text-sm leading-6 text-neutral-700">
                {copy("audience.insight", "Demografische data is gebaseerd op beschikbare accountdata van {{audience.platformsLabel}}. De beschikbaarheid kan per platform en account verschillen.")}
              </p>
            </ReportSection>
          ) : null}

          {sections.budgetValue ? <ReportSection>
            <SectionHeader kicker={copy("section.budget.kicker", "Budget en waarde")} title={copy("section.budget.title", "Betaald bereik versus extra bereik")} icon={<Wallet className="h-5 w-5" />} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatTile label={copy("budget.metric.budget.label", "Budget")} value={formatCurrency(data.campaign.totalBudget, "EUR", "nl")} helper={copy("budget.metric.budget.helper", "Netto campagnebudget")} />
              <StatTile label={copy("budget.metric.paidViews.label", "Betaalde views")} value={formatNumber(paidViews, "nl")} helper={copy("budget.metric.paidViews.helper", "Maximaal afgerekend tot doelbasis")} />
              <StatTile label={copy("budget.metric.extraReach.label", "Extra bereik")} value={formatNumber(data.performance.overdeliveryViews, "nl")} helper={copy("budget.metric.extraReach.helper", "Niet extra doorbelast")} />
              <StatTile label={copy("budget.metric.effectiveCpmTotal.label", "Effectieve CPM totaal")} value={formatCurrency(data.performance.costPerThousandViews ?? 0, "EUR", "nl")} helper={copy("budget.metric.effectiveCpmTotal.helper", "Gebaseerd op totale huidige views")} />
            </div>
          </ReportSection> : null}

          {sections.qualityAssurance ? <ReportSection>
            <SectionHeader kicker={copy("section.quality.kicker", "Kwaliteitscontrole")} title={copy("section.quality.title", "Validatie van prestaties")} icon={<ShieldCheck className="h-5 w-5" />} />
            <div className="grid gap-4 md:grid-cols-3">
              <StatTile label={copy("quality.status.label", "Kwaliteitsstatus")} value={reportQualityStatusLabel(data.quality.status)} helper={copy("quality.insight", "Alleen geldige prestaties zijn meegenomen.")} />
              <StatTile label={copy("quality.metric.approvedPerformance.label", "Goedgekeurde prestaties")} value={formatNumber(data.performance.currentViews, "nl")} helper={copy("quality.metric.approvedPerformance.helper", "Goedgekeurde views")} />
              <StatTile label={copy("quality.metric.excludedActivity.label", "Uitgesloten activiteit")} value={formatNumber(data.quality.excludedClips, "nl")} helper={copy("quality.metric.excludedActivity.helper", "Niet meegenomen in goedgekeurde prestaties")} />
            </div>
          </ReportSection> : null}

          {sections.nextCampaign && (recommendations.length > 0 || learnings.length > 0 || blocks["next.plan"]) ? (
            <ReportSection>
              <SectionHeader kicker={copy("section.next.kicker", "Aanbevelingen voor volgende campagne")} title={copy("section.next.title", "Concreet plan voor de volgende ronde")} icon={<ShieldCheck className="h-5 w-5" />} />
              <p className="mb-6 max-w-5xl text-xl leading-9 text-neutral-800">
                {copy("next.plan", "Heractiveer de best presterende creators en gebruik de winnende hooks opnieuw in de volgende briefing.")}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {[...recommendations, ...learnings].slice(0, 6).map((item, index) => (
                  <p key={`${item}-${index}`} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-700">
                    {copy(`next.card.${index}`, item)}
                  </p>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {sections.appendix ? <ReportSection>
            <SectionHeader kicker={copy("section.appendix.kicker", "Appendix")} title={copy("section.appendix.title", "Definities en samenvatting")} icon={<FileText className="h-5 w-5" />} />
            <div className="grid gap-3">
              <DefinitionRow label={copy("appendix.totalViewsDefinition.label", "Definitie totale views")} body={copy("appendix.totalViewsDefinition.body", "Alle live gemeten views op goedgekeurde clips.")} />
              <DefinitionRow label={copy("appendix.paidViewsDefinition.label", "Definitie betaalde views")} body={copy("appendix.paidViewsDefinition.body", "Views die worden afgerekend binnen het afgesproken doel en de campagnevoorwaarden.")} />
              <DefinitionRow label={copy("appendix.extraReachDefinition.label", "Definitie extra bereik")} body={copy("appendix.extraReachDefinition.body", "Views boven het afgesproken doel zonder extra budget.")} />
            </div>
          </ReportSection> : null}
        </div>
      </article>
  );
}

function ReportSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`report-print-page mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-6 text-neutral-950 shadow-[0_12px_35px_rgba(0,0,0,0.08)] sm:p-[18mm] ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ kicker, title, icon }: { kicker: string; title: string; icon: ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">{kicker}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal text-neutral-950">{title}</h2>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-5 ${accent ? "bg-emerald-50" : "bg-neutral-100"}`}>
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

function StatTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{helper}</p>
    </div>
  );
}

function StatText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-3 rounded-full bg-neutral-100">
      <div className="h-3 rounded-full bg-neutral-950" style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
    </div>
  );
}

function DeliveryProgress({
  currentViews,
  targetViews,
  currentLabel,
  targetLabel,
  extraReachLabel,
}: {
  currentViews: number;
  targetViews: number | null;
  currentLabel: string;
  targetLabel: string;
  extraReachLabel: string;
}) {
  const target = targetViews ?? 0;
  const progress = target > 0 ? Math.min(100, (currentViews / target) * 100) : 0;
  const extraReach = target > 0 ? Math.max(0, currentViews - target) : 0;
  return (
    <div className="mb-6 rounded-xl bg-neutral-950 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-400">{currentLabel}</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums">{formatNumber(currentViews, "nl")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-400">{targetLabel}</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{target ? formatNumber(target, "nl") : "-"}</p>
        </div>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(2, progress)}%` }} />
      </div>
      {extraReach > 0 ? (
        <p className="mt-4 text-right text-sm font-semibold">+{formatNumber(extraReach, "nl")} {extraReachLabel}</p>
      ) : null}
    </div>
  );
}

function CumulativeViewsChart({
  rows,
  currentViews,
  targetViews,
}: {
  rows: BrandReportLiveData["timeline"];
  currentViews: number;
  targetViews: number | null;
}) {
  const visibleRows = rows.length > 0 ? rows : [{ date: "Vandaag", views: currentViews, cumulativeViews: currentViews }];
  const max = Math.max(1, currentViews, targetViews ?? 0, ...visibleRows.map((row) => row.cumulativeViews));
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex h-64 items-end gap-2 border-b border-neutral-200 pb-4">
        {visibleRows.map((row, index) => (
          <div key={`${row.date}-${index}`} className="flex min-w-0 flex-1 items-end">
            <div
              className="w-full rounded-t bg-neutral-950"
              style={{ height: `${Math.max(4, (row.cumulativeViews / max) * 230)}px` }}
              title={`${row.date}: ${formatNumber(row.cumulativeViews, "nl")} views`}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between gap-4 text-sm text-neutral-500">
        <span>{visibleRows.length} meetpunten</span>
        <span>Huidige views: {formatNumber(currentViews, "nl")}</span>
      </div>
    </div>
  );
}

function DefinitionRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-neutral-200 p-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <p className="text-sm font-semibold text-neutral-500">{label}</p>
      <p className="text-sm leading-6 text-neutral-800">{body}</p>
    </div>
  );
}

function Distribution({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="font-semibold text-neutral-950">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-neutral-700">{row.label}</span>
              <span className="text-neutral-500">{formatAudienceShare(row.value)}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-neutral-100">
              <div className="h-full bg-neutral-950" style={{ width: `${audienceBarWidth(row.value)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPercent(value: number | null) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}
