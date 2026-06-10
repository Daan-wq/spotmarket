import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleOff,
  ExternalLink,
  Info,
  Play,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin/agency-format";
import {
  audienceBarWidth,
  formatAudienceCountryLabel,
  formatAudienceShare,
  reportQualityStatusLabel,
} from "@/lib/admin/campaign-report-display";
import type { BrandCampaignDashboardData } from "@/lib/brand-report-portal";
import { BrandViewsChart } from "./brand-views-chart";

interface BrandCampaignDashboardProps {
  selectedCampaignId: string;
  selectedCampaignStatus: "active" | "completed";
  data: BrandCampaignDashboardData;
}

export function BrandCampaignDashboard({
  selectedCampaignId,
  selectedCampaignStatus,
  data,
}: BrandCampaignDashboardProps) {
  const targetViews = data.performance.targetViews;
  const progress = data.performance.deliveryProgress
    ?? (targetViews && targetViews > 0 ? data.performance.currentViews / targetViews : null);
  const goalMeter = buildGoalMeterState(progress, targetViews);
  const paidViews = targetViews
    ? Math.min(data.performance.currentViews, targetViews)
    : data.performance.currentViews;

  return (
    <div>
      <header className="border-b border-neutral-200 pb-8 pt-10">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              {data.campaign.brandName}
            </p>
            <StatusBadge status={selectedCampaignStatus} />
          </div>
          <h1 className="mt-3 text-[clamp(2.25rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-neutral-950">
            {data.campaign.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatCampaignPeriod(data.campaign.startsAt, data.campaign.deadline)}
            </span>
            <span>Bijgewerkt {formatDate(data.generatedAt, "nl")}</span>
          </div>
        </div>
      </header>

      <section className="grid gap-10 border-b border-neutral-200 py-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] lg:gap-14 lg:py-14">
        <div className="grid items-center gap-8 sm:grid-cols-[minmax(170px,0.65fr)_minmax(0,1.35fr)] lg:gap-10">
          <GoalMeter meter={goalMeter} />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Totale views
            </p>
            <p className="mt-3 text-[clamp(3rem,7vw,6rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-neutral-950">
              {formatNumber(data.performance.currentViews, "nl")}
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-500">
              {targetViews
                ? `van ${formatNumber(targetViews, "nl")} doelviews uit alle goedgekeurde campagnecontent`
                : "goedgekeurde views uit alle campagnecontent"}
            </p>

            <div className="mt-8 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-neutral-950 pt-3">
              <span className="text-xs text-neutral-500">Verwachte doeldatum</span>
              <strong className="text-xl font-semibold tracking-[-0.025em] text-neutral-950">
                {formatForecastDate(data)}
              </strong>
              <p className="basis-full text-xs leading-5 text-neutral-500">
                {formatForecastDetail(data)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-neutral-950">
          <LedgerRow
            label="Budgetverbruik"
            value={formatCurrency(data.performance.budgetUsed, "EUR", "nl")}
            detail={`${formatPercent(data.performance.budgetUsedPercent)} van ${formatCurrency(data.campaign.totalBudget, "EUR", "nl")}`}
          />
          <LedgerRow
            label="Budget resterend"
            value={formatCurrency(data.performance.budgetRemaining, "EUR", "nl")}
            detail={
              data.performance.budgetUsedPercent == null
                ? "– beschikbaar"
                : `${formatPercent(Math.max(0, 1 - data.performance.budgetUsedPercent))} beschikbaar`
            }
          />
          <LedgerRow
            label="Effectieve CPM"
            value={formatNullableCurrency(data.performance.effectiveCpm)}
            detail={`Afgesproken CPM ${formatCurrency(data.performance.businessCpm, "EUR", "nl")}`}
          />
          <LedgerRow
            label="Over-delivery"
            value={formatNumber(data.performance.overdeliveryViews, "nl")}
            detail={`${formatPercent(data.performance.overdeliveryPercent)} boven viewdoel`}
            accent={data.performance.overdeliveryViews > 0}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 border-b border-neutral-200 sm:grid-cols-3 xl:grid-cols-5">
        <StripMetric label="Postende accounts" value={formatNumber(data.performance.uniquePages, "nl")} />
        <StripMetric label="Clips ingezonden" value={formatNumber(data.performance.totalSubmissions, "nl")} />
        <StripMetric label="Goedgekeurde clips" value={formatNumber(data.performance.approvedClips, "nl")} />
        <StripMetric
          label="Gem. views per clip"
          value={formatNullableNumber(data.performance.averageViewsPerApprovedClip)}
        />
        <StripMetric
          label={`Engagement · ${formatPercent(data.performance.engagementRate)}`}
          value={formatNumber(data.performance.totalEngagement, "nl")}
          className="col-span-2 sm:col-span-1"
        />
      </section>

      <section className="border-b border-neutral-200 py-10 lg:py-12">
        <SectionHeading
          eyebrow="Bereik"
          title="Viewgroei per dag"
          detail="Alleen goedgekeurde campagneprestaties"
        />
        <div className="mt-7">
          <BrandViewsChart
            data={data.timeline}
            milestones={data.milestones}
            pausePeriods={data.pausePeriods}
          />
        </div>
      </section>

      <section className="grid gap-12 py-10 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:py-12">
        <div>
          <SectionHeading eyebrow="Per kanaal" title="Platformoverzicht" />
          {data.platformBreakdown.length > 0 ? (
            <div className="mt-6 border-t-2 border-neutral-950">
              {data.platformBreakdown.map((platform) => (
                <div
                  key={platform.platform}
                  className="grid gap-4 border-b border-neutral-200 py-4 sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div>
                    <p className="font-semibold text-neutral-950">{platform.platform}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatNumber(platform.clips, "nl")} clips · {formatPercent(platform.engagementRate)} engagement
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 text-right">
                    <PlatformValue label="Views" value={formatNumber(platform.views, "nl")} />
                    <PlatformValue label="Effectieve CPM" value={formatNullableCurrency(platform.effectiveCpm)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 border-t-2 border-neutral-950 py-8 text-sm text-neutral-500">
              Nog geen platformdata beschikbaar.
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Leaderboard</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950">Topcontent</h2>
            </div>
            <Link
              href={`/brand/content?campaignId=${encodeURIComponent(selectedCampaignId)}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950"
            >
              Alle content bekijken
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-amber-950">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm leading-6">
              Reageer op deze video’s voor extra engagement en bereik via je eigen socials.
            </p>
          </div>

          {data.topContent.length > 0 ? (
            <div className="mt-5 border-t-2 border-neutral-950">
              {data.topContent.map((video, index) => (
                <article
                  key={video.id}
                  className="group grid grid-cols-[2rem_5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-neutral-200 py-3 sm:grid-cols-[2rem_6rem_minmax(0,1fr)_auto_auto] sm:gap-4"
                >
                  <span className="text-lg font-semibold tabular-nums text-neutral-400">{index + 1}</span>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-300">
                        <Play className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">{video.platform}</p>
                    <p className="mt-1 truncate text-xs font-medium text-neutral-700">{video.creator}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatNumber(video.engagement, "nl")} engagement
                    </p>
                    <p className="mt-1 text-xs font-semibold tabular-nums text-neutral-700 sm:hidden">
                      {formatNumber(video.views, "nl")} views
                    </p>
                  </div>
                  <p className="hidden text-right text-sm font-semibold tabular-nums text-neutral-950 sm:block">
                    {formatNumber(video.views, "nl")} views
                  </p>
                  <Link
                    href={video.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open video"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 border-t-2 border-neutral-950 py-12 text-center">
              <Target className="mx-auto h-6 w-6 text-neutral-300" />
              <h3 className="mt-4 text-base font-semibold text-neutral-950">Nog geen goedgekeurde topcontent</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Zodra goedgekeurde video’s views verzamelen, verschijnt de best presterende content hier.
              </p>
            </div>
          )}
        </div>
      </section>

      {data.creators.length > 0 ? (
        <section className="border-t border-neutral-200 py-10 lg:py-12">
          <SectionHeading
            eyebrow="Creators"
            title="Creatorbijdrage"
            detail={`${formatNumber(data.creators.length, "nl")} actieve bijdragers`}
          />
          <div className="mt-7 border-t-2 border-neutral-950">
            {data.creators.map((creator, index) => (
              <CreatorContributionRow
                key={`${creator.creator}-${index}`}
                creator={creator}
                maxViews={Math.max(1, ...data.creators.map((row) => row.views))}
              />
            ))}
          </div>
        </section>
      ) : null}

      {data.audience.sampleCount > 0 ? (
        <section className="border-t border-neutral-200 py-10 lg:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Doelgroep" title="Publiek en bereik" />
            <div className="flex items-center gap-3 text-sm">
              <span className="text-neutral-500">
                {formatNumber(data.audience.sampleCount, "nl")} {data.audience.platformsLabel || "Instagram"}-accounts
              </span>
              <Badge variant="neutral">{data.audience.fitStatus}</Badge>
            </div>
          </div>
          <div className="mt-7 grid gap-8 lg:grid-cols-3">
            <DashboardDistribution
              title="Toplanden"
              rows={data.audience.topCountries.slice(0, 5).map((row) => ({
                label: formatAudienceCountryLabel(row.code),
                value: row.share,
              }))}
            />
            <DashboardDistribution
              title="Leeftijd"
              rows={Object.entries(data.audience.ageBuckets).map(([label, value]) => ({ label, value }))}
            />
            <DashboardDistribution
              title="Gender"
              rows={Object.entries(data.audience.genderSplit).map(([label, value]) => ({ label, value }))}
            />
          </div>
        </section>
      ) : null}

      <section className="grid border-t border-neutral-200 lg:grid-cols-2">
        <div className="py-10 lg:pr-12 lg:py-12">
          <SectionHeading eyebrow="Financieel" title="Budget en waarde" />
          <div className="mt-7 border-t-2 border-neutral-950">
            <LedgerRow
              label="Betaalde views"
              value={formatNumber(paidViews, "nl")}
              detail="Binnen de afgesproken doelbasis"
            />
            <LedgerRow
              label="Totaal bereik"
              value={formatNumber(data.performance.currentViews, "nl")}
              detail="Alle goedgekeurde live views"
            />
            <LedgerRow
              label="Extra bereik"
              value={formatNumber(data.performance.overdeliveryViews, "nl")}
              detail="Zonder extra mediabudget"
              accent={data.performance.overdeliveryViews > 0}
            />
            <LedgerRow
              label="Effectieve CPM"
              value={formatNullableCurrency(data.performance.effectiveCpm)}
              detail={`Afgesproken CPM ${formatCurrency(data.performance.businessCpm, "EUR", "nl")}`}
            />
          </div>
        </div>

        <div className="border-t border-neutral-200 py-10 lg:border-l lg:border-t-0 lg:py-12 lg:pl-12">
          <SectionHeading eyebrow="Validatie" title="Kwaliteitscontrole" />
          <div className="mt-7 flex items-start justify-between gap-5 border-t-2 border-neutral-950 py-5">
            <div>
              <p className="text-sm text-neutral-500">Kwaliteitsstatus</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                {reportQualityStatusLabel(data.quality.status)}
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-neutral-950" />
          </div>
          <div className="grid grid-cols-3 border-t border-neutral-200">
            <QualityMetric label="Gecontroleerde clips" value={data.quality.reviewedClips} icon={<Users className="h-4 w-4" />} />
            <QualityMetric label="Uitgesloten clips" value={data.quality.excludedClips} icon={<CircleOff className="h-4 w-4" />} />
            <QualityMetric label="Uitgesloten views" value={data.quality.excludedViews} icon={<ShieldCheck className="h-4 w-4" />} />
          </div>
        </div>
      </section>
    </div>
  );
}

export function buildGoalMeterState(progress: number | null, targetViews: number | null) {
  if (!targetViews || targetViews <= 0 || progress == null || !Number.isFinite(progress)) {
    return {
      label: "–",
      degrees: 0,
      hasGoal: false,
    };
  }

  const normalizedProgress = Math.max(0, progress);
  return {
    label: `${Math.round(normalizedProgress * 100)}%`,
    degrees: Math.round(Math.min(normalizedProgress, 1) * 360),
    hasGoal: true,
  };
}

function GoalMeter({
  meter,
}: {
  meter: ReturnType<typeof buildGoalMeterState>;
}) {
  return (
    <div
      className="relative mx-auto grid aspect-square w-full max-w-56 place-items-center rounded-full sm:mx-0"
      style={{
        background: `conic-gradient(rgb(10 10 10) ${meter.degrees}deg, rgb(229 229 229) ${meter.degrees}deg)`,
      }}
      role="img"
      aria-label={meter.hasGoal ? `${meter.label} van het viewdoel bereikt` : "Geen viewdoel beschikbaar"}
    >
      <div className="absolute inset-[12%] rounded-full bg-white" />
      <div className="relative text-center">
        <strong className="block text-4xl font-semibold tracking-[-0.05em] text-neutral-950 sm:text-5xl">
          {meter.label}
        </strong>
        <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          van doel
        </span>
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-5 border-b border-neutral-200 py-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <div className="text-right">
        <p className={`text-2xl font-semibold tracking-[-0.03em] ${accent ? "text-emerald-700" : "text-neutral-950"}`}>
          {value}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{detail}</p>
      </div>
    </div>
  );
}

function StripMetric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`border-l border-t border-neutral-200 px-4 py-6 first:border-l-0 sm:px-5 xl:border-t-0 ${className}`}>
      <p className="min-h-8 text-xs leading-4 text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950">{value}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950">{title}</h2>
      </div>
      {detail ? <p className="text-sm text-neutral-500">{detail}</p> : null}
    </div>
  );
}

function PlatformValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-neutral-700">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "completed" }) {
  return (
    <Badge variant={status === "active" ? "verified" : "neutral"}>
      {status === "active" ? "Actief" : "Afgerond"}
    </Badge>
  );
}

function CreatorContributionRow({
  creator,
  maxViews,
}: {
  creator: BrandCampaignDashboardData["creators"][number];
  maxViews: number;
}) {
  const width = Math.max(3, (creator.views / maxViews) * 100);
  return (
    <div className="grid gap-3 border-b border-neutral-200 py-4 sm:grid-cols-[minmax(150px,0.75fr)_minmax(180px,1.25fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">{creator.creator}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {creator.approvedSubmissions}/{creator.submissions} clips goedgekeurd
        </p>
      </div>
      <div className="h-2 overflow-hidden bg-neutral-100">
        <div className="h-full bg-neutral-950 transition-[width] duration-500" style={{ width: `${width}%` }} />
      </div>
      <div className="text-left sm:text-right">
        <p className="text-sm font-semibold tabular-nums text-neutral-950">{formatNumber(creator.views, "nl")} views</p>
        <p className="mt-1 text-xs text-neutral-500">
          {formatPercent(creator.approvalRate)} goedgekeurd - {creator.reliabilityStatus}
        </p>
      </div>
    </div>
  );
}

function DashboardDistribution({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  return (
    <div>
      <p className="border-b-2 border-neutral-950 pb-3 text-sm font-semibold text-neutral-950">{title}</p>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-neutral-700">{row.label}</span>
              <span className="tabular-nums text-neutral-500">{formatAudienceShare(row.value)}</span>
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

function QualityMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-r border-neutral-200 py-5 last:border-r-0">
      <div className="flex items-center gap-2 text-neutral-500">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-neutral-950">{formatNumber(value, "nl")}</p>
    </div>
  );
}

function formatCampaignPeriod(start: string | null, end: string) {
  if (!start) return `Tot ${formatDate(end, "nl")}`;
  return `${formatDate(start, "nl")} – ${formatDate(end, "nl")}`;
}

function formatPercent(value: number | null) {
  if (value == null) return "–";
  return new Intl.NumberFormat("nl-NL", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNullableCurrency(value: number | null) {
  return value == null ? "–" : formatCurrency(value, "EUR", "nl");
}

function formatNullableNumber(value: number | null) {
  return value == null ? "–" : formatNumber(Math.round(value), "nl");
}

function formatForecastDate(data: BrandCampaignDashboardData) {
  return data.performance.forecast.expectedGoalDate
    ? formatDate(data.performance.forecast.expectedGoalDate, "nl")
    : "–";
}

function formatForecastDetail(data: BrandCampaignDashboardData) {
  const forecast = data.performance.forecast;
  if (forecast.status === "paused") {
    return "Forecast hervat zodra de campagne actief is";
  }
  if (forecast.averageViewsPerActiveDay == null) {
    return "Onvoldoende meetdata voor een betrouwbare forecast";
  }

  const pauseLabel = forecast.excludedPauseDays === 1
    ? "1 pauzedag uitgesloten"
    : `${formatNumber(forecast.excludedPauseDays, "nl")} pauzedagen uitgesloten`;
  return `${formatNumber(Math.round(forecast.averageViewsPerActiveDay), "nl")} views per actieve dag · ${pauseLabel}`;
}
