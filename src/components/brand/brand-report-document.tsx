import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  FileText,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin/agency-format";
import type { BrandReportLiveData } from "@/lib/brand-report-portal";
import { BrandReportActions } from "./brand-report-actions";

interface BrandReportDocumentProps {
  report: {
    title: string;
    updatedAt: Date | string;
    brandVisibleAt: Date | string | null;
  };
  data: BrandReportLiveData;
}

export function BrandReportDocument({ report, data }: BrandReportDocumentProps) {
  const coverImageUrl = data.topContent[0]?.thumbnailUrl ?? null;

  return (
    <div className="space-y-5">
      <div className="report-studio-chrome flex flex-wrap items-center justify-between gap-3">
        <Link href="/brand/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" />
          Terug naar rapporten
        </Link>
        <BrandReportActions />
      </div>

      <article className="report-print-root rounded-xl bg-[#efede8] px-3 py-5 sm:px-6" style={{ fontFamily: "var(--font-report), var(--font-sans)" }}>
        <div className="mx-auto w-full max-w-[1480px] space-y-5">
          <ReportSection className="relative min-h-[420px] overflow-hidden bg-neutral-950 p-8 text-white sm:p-12 lg:p-16">
            {coverImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-neutral-950/75" />
              </>
            ) : null}
            <div className="relative z-10 flex min-h-[320px] flex-col justify-between gap-12">
              <div>
                <Badge variant="verified">Definitief rapport</Badge>
                <h1 className="mt-8 max-w-5xl text-5xl font-semibold leading-[1.02] md:text-7xl">{report.title}</h1>
              </div>
              <div className="grid gap-6 border-t border-white/20 pt-8 md:grid-cols-4">
                <CoverFact label="Merk" value={data.campaign.brandName} />
                <CoverFact label="Campagne" value={data.campaign.name} />
                <CoverFact label="Periode" value={formatPeriod(data.period.start ?? data.campaign.startsAt, data.period.end ?? data.campaign.deadline)} />
                <CoverFact label="Gepubliceerd" value={formatDate(report.brandVisibleAt ?? report.updatedAt, "nl")} />
              </div>
            </div>
          </ReportSection>

          <ReportSection>
            <SectionHeader kicker="Resultaten" title="Campagneprestatie" icon={<FileText className="h-5 w-5" />} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Totale views" value={formatNumber(data.performance.currentViews, "nl")} helper="Goedgekeurde content" />
              <StatTile label="Doelviews" value={formatOptionalNumber(data.performance.targetViews)} helper={formatPercent(data.performance.deliveryProgress)} />
              <StatTile label="Over-delivery" value={formatNumber(data.performance.overdeliveryViews, "nl")} helper="Views boven het viewdoel" />
              <StatTile label="Goedgekeurde clips" value={formatNumber(data.performance.approvedClips, "nl")} helper={`${formatNumber(data.performance.totalSubmissions, "nl")} ingezonden`} />
              <StatTile label="Engagement" value={formatNumber(data.performance.totalEngagement, "nl")} helper="Likes, reacties en shares" />
              <StatTile label="Postende accounts" value={formatNumber(data.performance.uniquePages, "nl")} helper="Unieke publieke accounts" />
            </div>
          </ReportSection>

          <ReportSection>
            <SectionHeader kicker="Campagne" title="Inrichting en vereisten" icon={<Target className="h-5 w-5" />} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FactBlock label="Omschrijving" value={data.campaign.description} />
              <FactBlock label="Contenttype" value={data.campaign.contentType} />
              <FactBlock label="Vereisten" value={data.campaign.requirements} />
              <FactBlock label="Contentrichtlijnen" value={data.campaign.contentGuidelines} />
              <FactBlock label="Platforms" value={data.campaign.platforms.join(", ")} />
              <FactBlock label="Vereiste hashtags" value={data.campaign.requiredHashtags.join(", ")} />
              <FactBlock label="Doelgroep" value={formatTarget(data.campaign.target)} />
            </div>
          </ReportSection>

          <ReportSection>
            <SectionHeader kicker="Financiën" title="Budget en CPM" icon={<Wallet className="h-5 w-5" />} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Totaalbudget" value={formatCurrency(data.campaign.totalBudget, "EUR", "nl")} helper="Afgesproken campagnebudget" />
              <StatTile label="Budget gebruikt" value={formatCurrency(data.performance.budgetUsed, "EUR", "nl")} helper={formatPercent(data.performance.budgetUsedPercent)} />
              <StatTile label="Budget resterend" value={formatCurrency(data.performance.budgetRemaining, "EUR", "nl")} helper="Op rapportmoment" />
              <StatTile label="Effectieve CPM" value={formatOptionalCurrency(data.performance.effectiveCpm)} helper={`Afgesproken: ${formatCurrency(data.performance.businessCpm, "EUR", "nl")}`} />
            </div>
          </ReportSection>

          {data.platformBreakdown.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Platformen" title="Verdeling per kanaal" icon={<BarChart3 className="h-5 w-5" />} />
              <div className="grid gap-3">
                {data.platformBreakdown.map((row) => (
                  <div key={row.platform} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-[1.2fr_repeat(4,1fr)] md:items-center">
                    <p className="font-semibold text-neutral-950">{row.platform}</p>
                    <ReportValue label="Views" value={formatNumber(row.views, "nl")} />
                    <ReportValue label="Clips" value={formatNumber(row.clips, "nl")} />
                    <ReportValue label="Engagement" value={formatPercent(row.engagementRate)} />
                    <ReportValue label="Effectieve CPM" value={formatOptionalCurrency(row.effectiveCpm)} />
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {data.topContent.length > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Content" title="Topcontent" icon={<BarChart3 className="h-5 w-5" />} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.topContent.slice(0, 6).map((row, index) => (
                  <article key={row.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <div className="aspect-video bg-neutral-100">
                      {row.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex items-start justify-between gap-3 p-5">
                      <div>
                        <p className="text-xs font-semibold text-neutral-400">#{index + 1} · {row.platform}</p>
                        <p className="mt-2 text-lg font-semibold text-neutral-950">{formatNumber(row.views, "nl")} views</p>
                        <p className="mt-1 text-sm text-neutral-500">{formatNumber(row.engagement, "nl")} engagement</p>
                      </div>
                      <a href={row.postUrl} target="_blank" rel="noreferrer" aria-label="Bekijk video" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-950 hover:text-white">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {data.audience.sampleCount > 0 ? (
            <ReportSection>
              <SectionHeader kicker="Publiek" title="Beschikbare publieksdata" icon={<Users className="h-5 w-5" />} />
              <div className="grid gap-4 lg:grid-cols-3">
                <Distribution title="Toplanden" rows={data.audience.topCountries.map((row) => ({ label: row.code.toUpperCase(), value: row.share }))} />
                <Distribution title="Leeftijd" rows={Object.entries(data.audience.ageBuckets).map(([label, value]) => ({ label, value }))} />
                <Distribution title="Gender" rows={Object.entries(data.audience.genderSplit).map(([label, value]) => ({ label, value }))} />
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
        <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{title}</h2>
      </div>
    </div>
  );
}

function CoverFact({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>;
}

function StatTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{helper}</p></div>;
}

function FactBlock({ label, value }: { label: string; value: string | null }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">{label}</p><p className="mt-2 text-sm leading-6 text-neutral-700">{value || "–"}</p></div>;
}

function ReportValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-neutral-400">{label}</p><p className="mt-1 font-semibold tabular-nums text-neutral-950">{value}</p></div>;
}

function Distribution({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="font-semibold text-neutral-950">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex justify-between gap-3 text-xs"><span>{row.label}</span><span>{Math.round(row.value)}%</span></div>
            <div className="mt-1 h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-neutral-950" style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "–";
  if (!start) return `Tot ${formatDate(end, "nl")}`;
  if (!end) return `Vanaf ${formatDate(start, "nl")}`;
  return `${formatDate(start, "nl")} - ${formatDate(end, "nl")}`;
}

function formatPercent(value: number | null) {
  return value == null ? "–" : new Intl.NumberFormat("nl-NL", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function formatOptionalCurrency(value: number | null) {
  return value == null ? "–" : formatCurrency(value, "EUR", "nl");
}

function formatOptionalNumber(value: number | null) {
  return value == null ? "–" : formatNumber(value, "nl");
}

function formatTarget(target: BrandReportLiveData["campaign"]["target"]) {
  const values = [
    target.country ? `Land: ${target.country}` : null,
    target.countryPercent != null ? `Min. ${target.countryPercent}% uit doelland` : null,
    target.minAge18Percent != null ? `Min. ${target.minAge18Percent}% 18+` : null,
    target.malePercent != null ? `${target.malePercent}% man` : null,
    target.minFollowers > 0 ? `Min. ${formatNumber(target.minFollowers, "nl")} volgers` : null,
    target.minEngagementRate > 0 ? `Min. ${target.minEngagementRate}% engagement` : null,
  ].filter(Boolean);
  return values.length > 0 ? values.join(" · ") : "–";
}
