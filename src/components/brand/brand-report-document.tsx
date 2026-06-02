import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, ExternalLink, FileText, ShieldCheck, Sparkles, Target, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin/agency-format";
import { normalizeTextList, type CampaignReportEditorial } from "@/lib/admin/campaign-report-shared";
import { formatAudienceCountryLabel, formatAudienceShare, reportQualityStatusLabel } from "@/lib/admin/campaign-report-display";
import type { BrandReportLiveData } from "@/lib/brand-report-portal";
import { BrandReportActions } from "./brand-report-actions";

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
  const recommendations = normalizeTextList(report.nextCampaignRecommendations);
  const learnings = normalizeTextList(report.learnings);
  const keyTakeaways = normalizeTextList(report.keyTakeaways);
  const paidViews = data.performance.targetViews
    ? Math.min(data.performance.currentViews, data.performance.targetViews)
    : data.performance.paidEligibleViews;

  return (
    <div className="space-y-5">
      <div className="report-studio-chrome flex flex-wrap items-center justify-between gap-3">
        <Link href="/brand" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" />
          Terug naar rapporten
        </Link>
        <BrandReportActions />
      </div>

      <article className="report-print-root rounded-xl bg-[#efede8] px-3 py-5 sm:px-6" style={{ fontFamily: "var(--font-report), var(--font-sans)" }}>
        <div className="mx-auto w-full max-w-[1480px] space-y-5">
          <ReportSection className="relative min-h-[460px] overflow-hidden bg-neutral-950 p-8 text-white sm:p-12 lg:p-16">
            {editorial.editorialContent.coverImageUrl ?? data.campaign.bannerUrl ? (
              <>
                <img src={editorial.editorialContent.coverImageUrl ?? data.campaign.bannerUrl ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-neutral-950/72" />
              </>
            ) : null}
            <div className="relative z-10 flex min-h-[360px] flex-col justify-between gap-12">
              <div>
                <Badge variant="verified">Definitief rapport</Badge>
                <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-normal md:text-7xl">{report.title}</h1>
              </div>
              <div className="grid gap-6 border-t border-white/20 pt-8 md:grid-cols-4">
                <CoverFact label="Merk" value={data.campaign.brandName} />
                <CoverFact label="Campagne" value={data.campaign.name} />
                <CoverFact label="Periode" value={formatPeriod(data.period.start ?? data.campaign.startsAt, data.period.end ?? data.campaign.deadline)} />
                <CoverFact label="Rapportdatum" value={formatDate(report.brandVisibleAt ?? report.updatedAt, "nl")} />
              </div>
            </div>
          </ReportSection>

          <ReportSection>
            <SectionHeader kicker="Samenvatting" title="Resultaat in een oogopslag" icon={<FileText className="h-5 w-5" />} />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div>
                <p className="text-5xl font-semibold leading-none tracking-normal text-neutral-950 md:text-7xl">
                  {data.performance.deliveryProgress == null ? "Campagneprestatie" : `${Math.round(data.performance.deliveryProgress * 100)}% van doel`}
                </p>
                <p className="mt-6 max-w-4xl text-lg leading-8 text-neutral-800">
                  {renderTemplate(blocks["summary.body"] || report.executiveSummary, data)}
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
                <HeroMetric label="Totale views" value={formatNumber(data.performance.currentViews, "nl")} />
                <HeroMetric label="Doelviews" value={data.performance.targetViews ? formatNumber(data.performance.targetViews, "nl") : "-"} />
                <HeroMetric label="Extra bereik" value={formatNumber(data.performance.overdeliveryViews, "nl")} accent={data.performance.overdeliveryViews > 0} />
                <HeroMetric label="Goedgekeurde clips" value={formatNumber(data.performance.approvedClips, "nl")} />
              </div>
            </div>
          </ReportSection>

          <ReportSection>
            <SectionHeader kicker="Campagne in het kort" title="Doel, bereik en waarde" icon={<Target className="h-5 w-5" />} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Betaalde views" value={formatNumber(paidViews, "nl")} helper="Binnen het afgesproken doel" />
              <StatTile label="Extra bereik" value={formatNumber(data.performance.overdeliveryViews, "nl")} helper="Views boven doel zonder extra budget" />
              <StatTile label="Budget gebruikt" value={formatCurrency(data.performance.budgetUsed, "EUR", "nl")} helper={formatPercent(data.performance.budgetUsedPercent)} />
              <StatTile label="Effectieve CPM" value={formatCurrency(data.performance.costPerThousandViews ?? 0, "EUR", "nl")} helper="Gebaseerd op totale views" />
            </div>
          </ReportSection>

          {data.topContent.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Contentprestaties" title="Topclips en winnende patronen" icon={<Sparkles className="h-5 w-5" />} />
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
                        <StatText label="Views" value={formatNumber(row.views, "nl")} />
                        <StatText label="Engagement" value={formatNumber(row.engagement, "nl")} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {data.platformBreakdown.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Platformprestaties" title="Kanaalvergelijking" icon={<BarChart3 className="h-5 w-5" />} />
              <div className="grid gap-3">
                {data.platformBreakdown.map((row) => (
                  <div key={row.platform} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-neutral-950">{row.platform}</p>
                        <p className="mt-1 text-sm text-neutral-500">{row.clips} goedgekeurde clips / {formatPercent(row.engagementRate)} engagement</p>
                      </div>
                      <p className="text-2xl font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {data.creators.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Creatorbijdrage" title="Bijdrage van creators" icon={<Users className="h-5 w-5" />} />
              <div className="grid gap-3">
                {data.creators.slice(0, 8).map((row) => (
                  <div key={row.creator} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-[180px_minmax(0,1fr)_140px] md:items-center">
                    <div>
                      <p className="font-semibold text-neutral-950">{row.creator}</p>
                      <p className="text-sm text-neutral-500">{row.approvedSubmissions}/{row.submissions} clips goedgekeurd</p>
                    </div>
                    <Progress value={row.views} max={Math.max(1, ...data.creators.map((creator) => creator.views))} />
                    <p className="text-right font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {data.audience.sampleCount > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Publiek en bereik" title="Bereikt publiek" icon={<Users className="h-5 w-5" />} />
              <div className="grid gap-4 lg:grid-cols-3">
                <Distribution title="Top landen" rows={data.audience.topCountries.map((row) => ({ label: formatAudienceCountryLabel(row.code), value: row.share }))} />
                <Distribution title="Leeftijd" rows={Object.entries(data.audience.ageBuckets).map(([label, value]) => ({ label, value }))} />
                <Distribution title="Gender" rows={Object.entries(data.audience.genderSplit).map(([label, value]) => ({ label, value }))} />
              </div>
            </ReportSection>
          ) : null}

          <ReportSection>
            <SectionHeader kicker="Budget en kwaliteit" title="Betaald bereik en validatie" icon={<Wallet className="h-5 w-5" />} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Budget" value={formatCurrency(data.campaign.totalBudget, "EUR", "nl")} helper="Campagnebudget" />
              <StatTile label="Betaalde views" value={formatNumber(paidViews, "nl")} helper="Maximaal tot doelbasis" />
              <StatTile label="Kwaliteitsstatus" value={reportQualityStatusLabel(data.quality.status)} helper="High-level validatie" />
              <StatTile label="Gecontroleerde clips" value={formatNumber(data.quality.reviewedClips, "nl")} helper="Goedgekeurde reviews" />
            </div>
          </ReportSection>

          {(recommendations.length > 0 || learnings.length > 0) ? (
            <ReportSection>
              <SectionHeader kicker="Volgende campagne" title="Aanbevelingen voor de volgende ronde" icon={<ShieldCheck className="h-5 w-5" />} />
              <div className="grid gap-3 md:grid-cols-2">
                {[...recommendations, ...learnings].slice(0, 6).map((item) => (
                  <p key={item} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-700">{item}</p>
                ))}
              </div>
            </ReportSection>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function ReportSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg bg-[#fbfcfc] p-6 text-neutral-950 shadow-sm sm:p-8 ${className}`}>{children}</section>;
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

function CoverFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
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

function Distribution({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
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
            <Progress value={row.value} max={max} />
          </div>
        ))}
      </div>
    </div>
  );
}

function renderTemplate(template: string, data: BrandReportLiveData) {
  const values: Record<string, string> = {
    "campaign.name": data.campaign.name,
    "campaign.brandName": data.campaign.brandName,
    "campaign.totalBudget": formatCurrency(data.campaign.totalBudget, "EUR", "nl"),
    "performance.currentViews": formatNumber(data.performance.currentViews, "nl"),
    "performance.approvedClips": formatNumber(data.performance.approvedClips, "nl"),
    "performance.targetViews": data.performance.targetViews ? formatNumber(data.performance.targetViews, "nl") : "-",
    "performance.overdeliveryViews": formatNumber(data.performance.overdeliveryViews, "nl"),
    "performance.costPerThousandViews": formatCurrency(data.performance.costPerThousandViews ?? 0, "EUR", "nl"),
  };
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) => values[key] ?? "-");
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "-";
  if (!start) return `Tot ${formatDate(end!, "nl")}`;
  if (!end) return `Vanaf ${formatDate(start, "nl")}`;
  return `${formatDate(start, "nl")} - ${formatDate(end, "nl")}`;
}

function formatPercent(value: number | null) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}
