import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Info,
  Play,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/admin/agency-format";
import type { BrandCampaignDashboardData } from "@/lib/brand-report-portal";
import { BrandViewsChart } from "./brand-views-chart";

export interface BrandPortalCampaignOption {
  id: string;
  name: string;
  status: "active" | "completed";
  brandName: string;
}

interface BrandCampaignDashboardProps {
  campaigns: BrandPortalCampaignOption[];
  selectedCampaignId: string;
  data: BrandCampaignDashboardData;
}

export function BrandCampaignDashboard({
  campaigns,
  selectedCampaignId,
  data,
}: BrandCampaignDashboardProps) {
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0];
  const targetViews = data.performance.targetViews;
  const progress = data.performance.deliveryProgress
    ?? (targetViews && targetViews > 0 ? data.performance.currentViews / targetViews : null);
  const progressPercent = progress == null ? null : Math.max(0, Math.round(progress * 100));
  const progressWidth = progressPercent == null ? 0 : Math.min(progressPercent, 100);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              {data.campaign.brandName}
            </p>
            <StatusBadge status={selectedCampaign.status} />
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

        <CampaignPicker campaigns={campaigns} selectedCampaignId={selectedCampaignId} />
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-[28px] bg-neutral-950 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-neutral-400">Campagnedoel</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {formatNumber(data.performance.currentViews, "nl")}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                {targetViews
                  ? `van ${formatNumber(targetViews, "nl")} doelviews`
                  : "goedgekeurde views"}
              </p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5">
              <span className="text-lg font-semibold">{progressPercent == null ? "–" : `${progressPercent}%`}</span>
            </div>
          </div>
          <div className="mt-10 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-200">
          <MetricRow
            label="Totale views"
            value={formatNumber(data.performance.currentViews, "nl")}
            detail="Goedgekeurde content"
          />
          <MetricRow
            label="Budgetverbruik"
            value={formatCurrency(data.performance.budgetUsed, "EUR", "nl")}
            detail={`${formatCurrency(data.campaign.totalBudget, "EUR", "nl")} totaal · ${formatPercent(data.performance.budgetUsedPercent)}`}
          />
          <MetricRow
            label="Over-delivery"
            value={formatNumber(data.performance.overdeliveryViews, "nl")}
            detail={`${formatPercent(data.performance.overdeliveryPercent)} extra bereik`}
            accent={data.performance.overdeliveryViews > 0}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardMetric label="Budget resterend" value={formatCurrency(data.performance.budgetRemaining, "EUR", "nl")} />
        <DashboardMetric label="Afgesproken CPM" value={formatCurrency(data.performance.businessCpm, "EUR", "nl")} />
        <DashboardMetric label="Effectieve CPM" value={formatNullableCurrency(data.performance.effectiveCpm)} />
        <DashboardMetric label="Verwachte doeldatum" value={data.performance.expectedGoalDate ? formatDate(data.performance.expectedGoalDate, "nl") : "–"} />
        <DashboardMetric label="Postende accounts" value={formatNumber(data.performance.uniquePages, "nl")} />
        <DashboardMetric label="Clips ingezonden" value={formatNumber(data.performance.totalSubmissions, "nl")} />
        <DashboardMetric label="Goedgekeurde clips" value={formatNumber(data.performance.approvedClips, "nl")} />
        <DashboardMetric label="Gem. views per clip" value={formatNullableNumber(data.performance.averageViewsPerApprovedClip)} />
        <DashboardMetric
          label="Engagement"
          value={formatNumber(data.performance.totalEngagement, "nl")}
          detail={formatPercent(data.performance.engagementRate)}
        />
      </section>

      <section className="border-t border-neutral-200 pt-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Bereik</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950">Viewgroei per dag</h2>
          </div>
          <p className="text-sm text-neutral-500">Alleen goedgekeurde campagneprestaties</p>
        </div>
        <BrandViewsChart data={data.timeline} milestones={data.milestones} />

        <div className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Per kanaal</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-neutral-950">Platformoverzicht</h3>
          {data.platformBreakdown.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
              <div className="hidden grid-cols-[1.2fr_repeat(4,1fr)] gap-4 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400 md:grid">
                <span>Platform</span><span>Views</span><span>Clips</span><span>Engagement</span><span>Effectieve CPM</span>
              </div>
              {data.platformBreakdown.map((platform) => (
                <div key={platform.platform} className="grid gap-3 border-t border-neutral-200 px-5 py-4 first:border-t-0 md:grid-cols-[1.2fr_repeat(4,1fr)] md:items-center">
                  <p className="font-semibold text-neutral-950">{platform.platform}</p>
                  <PlatformValue label="Views" value={formatNumber(platform.views, "nl")} />
                  <PlatformValue label="Clips" value={formatNumber(platform.clips, "nl")} />
                  <PlatformValue label="Engagement" value={formatPercent(platform.engagementRate)} />
                  <PlatformValue label="Effectieve CPM" value={formatNullableCurrency(platform.effectiveCpm)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Nog geen platformdata beschikbaar.</p>
          )}
        </div>
      </section>

      <section className="space-y-6 border-t border-neutral-200 pt-8">
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

        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm leading-6">
            Reageer op deze video’s voor extra engagement en bereik via je eigen socials.
          </p>
        </div>

        {data.topContent.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.topContent.map((video, index) => (
              <article key={video.id} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-300">
                      <Play className="h-10 w-10" />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 flex h-9 min-w-9 items-center justify-center rounded-full bg-neutral-950 px-2 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{video.platform}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                        {formatNumber(video.views, "nl")} views
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {formatNumber(video.engagement, "nl")} engagement
                      </p>
                    </div>
                    <Link
                      href={video.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open video"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
            <Target className="mx-auto h-6 w-6 text-neutral-300" />
            <h3 className="mt-4 text-base font-semibold text-neutral-950">Nog geen goedgekeurde topcontent</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Zodra goedgekeurde video’s views verzamelen, verschijnt de best presterende content hier.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-[-0.025em] text-neutral-950">{value}</p>
        {detail ? <p className="text-xs text-neutral-500">{detail}</p> : null}
      </div>
    </div>
  );
}

function PlatformValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 md:hidden">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-neutral-700 md:mt-0">{value}</p>
    </div>
  );
}

function CampaignPicker({
  campaigns,
  selectedCampaignId,
}: {
  campaigns: BrandPortalCampaignOption[];
  selectedCampaignId: string;
}) {
  const selected = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0];

  return (
    <details className="group relative w-full lg:w-80">
      <summary className="flex h-14 cursor-pointer list-none items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 transition hover:border-neutral-400 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Campagne</p>
          <p className="truncate text-sm font-semibold text-neutral-950">{selected.name}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/brand?campaignId=${encodeURIComponent(campaign.id)}`}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-neutral-100 ${
              campaign.id === selectedCampaignId ? "bg-neutral-100" : ""
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-neutral-950">{campaign.name}</span>
              <span className="mt-0.5 block truncate text-xs text-neutral-500">{campaign.brandName}</span>
            </span>
            <StatusBadge status={campaign.status} />
          </Link>
        ))}
      </div>
    </details>
  );
}

function StatusBadge({ status }: { status: BrandPortalCampaignOption["status"] }) {
  return (
    <Badge variant={status === "active" ? "verified" : "neutral"}>
      {status === "active" ? "Actief" : "Afgerond"}
    </Badge>
  );
}

function MetricRow({
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
    <div className="bg-white px-5 py-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <p className={`text-2xl font-semibold tracking-[-0.025em] ${accent ? "text-emerald-700" : "text-neutral-950"}`}>
          {value}
        </p>
        <p className="text-xs text-neutral-500">{detail}</p>
      </div>
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
