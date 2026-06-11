import type { ReactNode } from "react";
import { BarChart3, ExternalLink, FileText, ShieldCheck, Target, Users, Wallet } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/admin/agency-format";
import {
  audienceBarWidth,
  formatAudienceCountryLabel,
  formatAudienceShare,
  sortAudienceAgeRows,
  sortAudienceGenderRows,
} from "@/lib/admin/campaign-report-display";
import type { CampaignReportEditorial } from "@/lib/admin/campaign-report-shared";
import {
  buildBrandReportDocumentModel,
  type BrandReportDocumentModel,
} from "@/lib/brand-report-document-model";
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
  const model = buildBrandReportDocumentModel({ report, data, editorial });
  const hasOverviewPage = Boolean(model.summary || model.result);
  const hasChannelPage = Boolean(model.platforms || model.content);
  const hasPeoplePage = Boolean(model.creators || model.audience);
  const hasClosingPage = Boolean(model.budget || model.quality || model.recommendations);

  return (
    <article
      className="report-print-root bg-[#efede8] px-0 py-5 sm:px-6"
      style={{ fontFamily: "var(--font-report), var(--font-sans)" }}
    >
      <div className="mx-auto w-full max-w-[210mm] space-y-5">
        {model.cover ? (
          <ReportPage className="flex min-h-[250mm] items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                {model.cover.kicker}
              </p>
              <h1 className="mt-8 max-w-4xl text-6xl font-black leading-[0.98] text-neutral-950 md:text-7xl">
                {model.cover.title}
              </h1>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-neutral-200 pt-5 text-sm text-neutral-500">
                <span>{model.brandName}</span>
                <span>{model.campaignName}</span>
              </div>
            </div>
          </ReportPage>
        ) : null}

        {hasOverviewPage ? (
          <ReportPage>
            {model.summary ? <SummarySection model={model} /> : null}
            {model.result ? <ResultSection model={model} /> : null}
          </ReportPage>
        ) : null}

        {model.performance ? (
          <ReportPage>
            <SectionHeader
              kicker={model.performance.kicker}
              title={model.performance.title}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <CumulativeViewsChart
              rows={model.performance.timeline}
              currentViews={model.metrics.currentViews}
              targetViews={model.metrics.targetViews}
            />
            <Insight>{model.performance.insight}</Insight>
          </ReportPage>
        ) : null}

        {hasChannelPage ? (
          <ReportPage>
            {model.platforms ? <PlatformSection model={model} /> : null}
            {model.content ? <ContentLeaderboard model={model} /> : null}
          </ReportPage>
        ) : null}

        {hasPeoplePage ? (
          <ReportPage>
            {model.creators ? <CreatorSection model={model} /> : null}
            {model.audience ? <AudienceSection model={model} /> : null}
          </ReportPage>
        ) : null}

        {hasClosingPage ? (
          <ReportPage>
            {model.budget ? <BudgetSection model={model} /> : null}
            {model.quality ? <QualitySection model={model} /> : null}
            {model.recommendations ? <RecommendationSection model={model} /> : null}
          </ReportPage>
        ) : null}

        {model.appendix ? (
          <ReportPage>
            <SectionHeader kicker="Appendix" title="Definities en toelichting" icon={<FileText className="h-5 w-5" />} />
            <div className="grid gap-3">
              <DefinitionRow label="Totale views" body="Alle live gemeten views op goedgekeurde clips." />
              <DefinitionRow label="Betaalde views" body="Views die worden afgerekend binnen het afgesproken doel en de campagnevoorwaarden." />
              <DefinitionRow label="Extra bereik" body="Views boven het afgesproken doel zonder extra budget." />
              {model.appendix.note ? <Insight>{model.appendix.note}</Insight> : null}
            </div>
          </ReportPage>
        ) : null}
      </div>
    </article>
  );
}

function SummarySection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.summary) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker={model.summary.kicker} title={model.summary.title} icon={<FileText className="h-5 w-5" />} />
      <p className="max-w-4xl text-lg leading-8 text-neutral-800">{model.summary.body}</p>
      {model.summary.takeaways.length > 0 ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {model.summary.takeaways.map((takeaway) => (
            <p key={takeaway} className="rounded-lg bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-800">
              {takeaway}
            </p>
          ))}
        </div>
      ) : null}
    </ReportBlock>
  );
}

function ResultSection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.result) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker={model.result.kicker} title={model.result.title} icon={<Target className="h-5 w-5" />} />
      <DeliveryProgress currentViews={model.result.currentViews} targetViews={model.result.targetViews} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Betaalde views" value={formatNumber(model.result.paidViews, "nl")} />
        <StatTile label="Extra bereik" value={formatNumber(model.result.extraReach, "nl")} />
        <StatTile label="Goedgekeurde clips" value={formatNumber(model.result.approvedClips, "nl")} />
        <StatTile label="Budget gebruikt" value={formatCurrency(model.result.budgetUsed, "EUR", "nl")} />
      </div>
      <CpmComparison model={model} />
    </ReportBlock>
  );
}

function PlatformSection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.platforms) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker={model.platforms.kicker} title={model.platforms.title} icon={<BarChart3 className="h-5 w-5" />} />
      <div className="grid gap-3">
        {model.platforms.rows.map((row) => (
          <div key={row.platform} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-neutral-950">{row.platform}</p>
                <p className="mt-1 text-sm text-neutral-500">{row.clips} goedgekeurde clips</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")}</p>
                <p className="text-xs text-neutral-500">views</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-4">
              <InlineMetric label="Gem. views per clip" value={formatNumber(row.views / Math.max(1, row.clips), "nl")} />
              <InlineMetric label="Engagement" value={formatNumber(row.engagement, "nl")} />
              <InlineMetric label="Afgesproken CPM" value={formatNullableCurrency(row.agreedCpm)} />
              <InlineMetric label="Effectieve CPM" value={formatNullableCurrency(row.effectiveCpm)} />
            </div>
            {row.recommendation ? <p className="mt-4 text-sm leading-6 text-neutral-600">{row.recommendation}</p> : null}
          </div>
        ))}
      </div>
    </ReportBlock>
  );
}

function ContentLeaderboard({ model }: { model: BrandReportDocumentModel }) {
  if (!model.content) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker={model.content.kicker} title={model.content.title} icon={<BarChart3 className="h-5 w-5" />} />
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        {model.content.rows.map((row, index) => (
          <div
            key={row.id}
            data-report-content-row={row.id}
            className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-neutral-100 bg-white px-4 py-3 last:border-b-0"
          >
            <span className="text-sm font-bold tabular-nums text-neutral-400">{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-950">{row.creator}</p>
              <p className="text-xs text-neutral-500">{row.platform} · {formatNumber(row.engagement, "nl")} engagement</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold tabular-nums text-neutral-950">{formatNumber(row.views, "nl")} views</p>
              <a href={row.postUrl} target="_blank" rel="noreferrer" aria-label="Bekijk video" className="text-neutral-500 hover:text-neutral-950">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </ReportBlock>
  );
}

function CreatorSection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.creators) return null;
  const maxViews = Math.max(1, ...model.creators.rows.map((row) => row.views));
  return (
    <ReportBlock>
      <SectionHeader kicker={model.creators.kicker} title={model.creators.title} icon={<Users className="h-5 w-5" />} />
      <div className="grid gap-2">
        {model.creators.rows.map((row) => (
          <div key={row.creator} className="grid gap-3 rounded-lg border border-neutral-200 p-3 sm:grid-cols-[170px_minmax(0,1fr)_120px] sm:items-center">
            <div>
              <p className="font-semibold text-neutral-950">{row.creator}</p>
              <p className="text-xs text-neutral-500">{row.approvedSubmissions}/{row.submissions} clips goedgekeurd</p>
            </div>
            <Progress value={row.views} max={maxViews} />
            <p className="text-right font-semibold tabular-nums">{formatNumber(row.views, "nl")}</p>
          </div>
        ))}
      </div>
    </ReportBlock>
  );
}

function AudienceSection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.audience) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker="Publiek en bereik" title="Bereikt publiek" icon={<Users className="h-5 w-5" />} />
      <div className="grid gap-3 lg:grid-cols-3">
        <Distribution
          title="Top landen"
          emptyLabel="Geen landen beschikbaar"
          rows={model.audience.topCountries.slice(0, 5).map((row) => ({
            label: formatAudienceCountryLabel(row.code),
            value: row.share,
          }))}
        />
        <Distribution title="Leeftijd" rows={sortAudienceAgeRows(model.audience.ageBuckets)} />
        <Distribution title="Gender" rows={sortAudienceGenderRows(model.audience.genderSplit)} />
      </div>
      <Insight>{model.audience.insight}</Insight>
    </ReportBlock>
  );
}

function BudgetSection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.budget) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker="Budget en waarde" title="Betaald bereik versus extra bereik" icon={<Wallet className="h-5 w-5" />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Campagnebudget" value={formatCurrency(model.budget.totalBudget, "EUR", "nl")} />
        <StatTile label="Budget gebruikt" value={formatCurrency(model.budget.budgetUsed, "EUR", "nl")} />
        <StatTile label="Extra bereik" value={formatNumber(model.budget.extraReach, "nl")} />
      </div>
      <CpmComparison model={model} />
      {model.budget.note ? <p className="mt-4 text-sm leading-6 text-neutral-600">{model.budget.note}</p> : null}
    </ReportBlock>
  );
}

function QualitySection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.quality) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker="Kwaliteitscontrole" title="Validatie van prestaties" icon={<ShieldCheck className="h-5 w-5" />} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Gecontroleerde clips" value={formatNumber(model.quality.reviewedClips, "nl")} />
        <StatTile label="Uitgesloten clips" value={formatNumber(model.quality.excludedClips, "nl")} />
        <StatTile label="Uitgesloten views" value={formatNumber(model.quality.excludedViews, "nl")} />
      </div>
    </ReportBlock>
  );
}

function RecommendationSection({ model }: { model: BrandReportDocumentModel }) {
  if (!model.recommendations || model.recommendations.items.length === 0) return null;
  return (
    <ReportBlock>
      <SectionHeader kicker={model.recommendations.kicker} title={model.recommendations.title} icon={<Target className="h-5 w-5" />} />
      <div className="grid gap-3 sm:grid-cols-2">
        {model.recommendations.items.map((item, index) => (
          <p key={`${item}-${index}`} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-700">
            {item}
          </p>
        ))}
      </div>
    </ReportBlock>
  );
}

function CpmComparison({ model }: { model: BrandReportDocumentModel }) {
  return (
    <div className="mt-4 rounded-xl bg-neutral-950 p-5 text-white">
      <div className="grid gap-4 sm:grid-cols-2">
        <InlineMetric label="Afgesproken CPM" value={formatNullableCurrency(model.cpm.agreed)} invert />
        <InlineMetric label="Effectieve CPM" value={formatNullableCurrency(model.cpm.effective)} invert />
      </div>
      <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-6 text-neutral-300">{model.cpm.explanation}</p>
    </div>
  );
}

function ReportPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`report-print-page mx-auto w-full max-w-[210mm] bg-white p-6 text-neutral-950 shadow-[0_12px_35px_rgba(0,0,0,0.08)] sm:p-[16mm] ${className}`}>
      {children}
    </section>
  );
}

function ReportBlock({ children }: { children: ReactNode }) {
  return <section className="border-b border-neutral-200 py-8 first:pt-0 last:border-b-0 last:pb-0">{children}</section>;
}

function SectionHeader({ kicker, title, icon }: { kicker: string; title: string; icon: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">{kicker}</p>
        <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{title}</h2>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

function InlineMetric({ label, value, invert = false }: { label: string; value: string; invert?: boolean }) {
  return (
    <div>
      <p className={`text-xs ${invert ? "text-neutral-400" : "text-neutral-500"}`}>{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${invert ? "text-white" : "text-neutral-950"}`}>{value}</p>
    </div>
  );
}

function Insight({ children }: { children: ReactNode }) {
  return <p className="mt-5 border-l-4 border-neutral-950 bg-neutral-50 px-5 py-4 text-sm leading-6 text-neutral-700">{children}</p>;
}

function Progress({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2.5 rounded-full bg-neutral-100">
      <div className="h-2.5 rounded-full bg-neutral-950" style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
    </div>
  );
}

function DeliveryProgress({ currentViews, targetViews }: { currentViews: number; targetViews: number | null }) {
  const target = targetViews ?? 0;
  const progress = target > 0 ? Math.min(100, (currentViews / target) * 100) : 0;
  const extraReach = target > 0 ? Math.max(0, currentViews - target) : 0;
  return (
    <div className="mb-4 rounded-xl bg-neutral-950 p-5 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-400">Voortgang naar doel</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums">{formatNumber(currentViews, "nl")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-400">Doelviews</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{target ? formatNumber(target, "nl") : "-"}</p>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(2, progress)}%` }} />
      </div>
      {extraReach > 0 ? <p className="mt-3 text-right text-sm font-semibold">+{formatNumber(extraReach, "nl")} extra bereik</p> : null}
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
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex h-56 items-end gap-2 border-b border-neutral-200 pb-4">
        {visibleRows.map((row, index) => (
          <div key={`${row.date}-${index}`} className="flex min-w-0 flex-1 items-end">
            <div className="w-full rounded-t bg-neutral-950" style={{ height: `${Math.max(4, (row.cumulativeViews / max) * 198)}px` }} />
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

function Distribution({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="font-semibold text-neutral-950">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && emptyLabel ? (
          <p className="text-sm leading-6 text-neutral-500">{emptyLabel}</p>
        ) : rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-neutral-700">{row.label}</span>
              <span className="tabular-nums text-neutral-500">{formatAudienceShare(row.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100">
              <div className="h-2 rounded-full bg-neutral-950" style={{ width: audienceBarWidth(row.value) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DefinitionRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-neutral-200 p-4 md:grid-cols-[180px_minmax(0,1fr)]">
      <p className="text-sm font-semibold text-neutral-500">{label}</p>
      <p className="text-sm leading-6 text-neutral-800">{body}</p>
    </div>
  );
}

function formatNullableCurrency(value: number | null) {
  return value == null ? "-" : formatCurrency(value, "EUR", "nl");
}
