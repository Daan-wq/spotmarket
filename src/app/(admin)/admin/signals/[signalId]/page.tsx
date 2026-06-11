import type { DemographicSource, Prisma } from "@prisma/client";
import { Globe2 } from "lucide-react";
import { notFound } from "next/navigation";
import { SignalResolveButton } from "@/components/admin/signal-resolve-button";
import { SignalViewGrowthChart } from "@/components/admin/signal-view-growth-chart";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/ui/page";
import { formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { metricAvailabilityValue, type MetricAvailabilityKey } from "@/lib/contracts/metrics";
import { AUTO_ANTIBOT_RESOLVED_BY } from "@/lib/metrics/anti-bot-signal";
import {
  ASIAN_AUDIENCE_POINTS_PER_PERCENT,
  audienceSharePercent,
  calculateAsianAudienceRisk,
  isAsianCountry,
  parseAudienceCountries,
  type AudienceCountryShare,
} from "@/lib/metrics/audience-risk";
import {
  isValidMetricSnapshot,
  VALID_METRIC_SNAPSHOT_WHERE,
} from "@/lib/metrics/valid-snapshots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ signalId: string }>;
}

type SnapshotPoint = {
  capturedAt: Date;
  source?: string | null;
  viewCount: bigint;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number | null;
  watchTimeSec?: number | null;
  reachCount?: number | null;
  totalInteractions?: number | null;
  followsFromMedia?: number | null;
  profileVisits?: number | null;
  reactionsByType?: Prisma.JsonValue | null;
  profileActivity?: Prisma.JsonValue | null;
  raw?: Prisma.JsonValue | null;
  metricAvailability: Prisma.JsonValue | null;
};

type PayloadRecord = Record<string, unknown>;

type EvidenceItem = {
  kind: string;
  label: string;
  points: number;
  metrics: Record<string, number | string | null>;
};

export default async function SignalDetailPage({ params }: PageProps) {
  const { signalId } = await params;

  const signal = await prisma.submissionSignal.findUnique({
    where: { id: signalId },
    include: {
      submission: {
        include: {
          campaign: { select: { id: true, name: true } },
          metricSnapshots: {
            where: VALID_METRIC_SNAPSHOT_WHERE,
            orderBy: { capturedAt: "desc" },
            select: {
              capturedAt: true,
              source: true,
              viewCount: true,
              likeCount: true,
              commentCount: true,
              shareCount: true,
              saveCount: true,
              watchTimeSec: true,
              reachCount: true,
              totalInteractions: true,
              followsFromMedia: true,
              profileVisits: true,
              reactionsByType: true,
              profileActivity: true,
              raw: true,
              metricAvailability: true,
            },
          },
        },
      },
    },
  });

  if (!signal?.submission) return notFound();

  const submission = signal.submission;
  const audienceSnapshot =
    submission.sourceConnectionType && submission.sourceConnectionId
      ? await prisma.audienceSnapshot.findFirst({
          where: {
            connectionType: submission.sourceConnectionType,
            connectionId: submission.sourceConnectionId,
            kind: "FOLLOWER",
          },
          orderBy: { capturedAt: "desc" },
          select: {
            capturedAt: true,
            source: true,
            topCountries: true,
          },
        })
      : null;
  const snapshots = [...submission.metricSnapshots].reverse();
  const latest = latestSnapshot(snapshots.filter(isValidMetricSnapshot));
  const currentViews = latest ? Number(latest.viewCount) : (submission.viewCount ?? submission.claimedViews);
  const currentEngagements = latest
    ? snapshotEngagements(latest)
    : legacyEngagements(submission);
  const chartSnapshots = snapshots.map((snapshot) => ({
    capturedAt: snapshot.capturedAt.toISOString(),
    viewCount: Number(snapshot.viewCount),
    engagementCount: snapshotEngagements(snapshot),
    likeCount: snapshot.likeCount,
    commentCount: snapshot.commentCount,
    shareCount: snapshot.shareCount,
    saveCount: snapshot.saveCount,
    watchTimeSec: snapshot.watchTimeSec,
    reachCount: snapshot.reachCount,
    totalInteractions: snapshot.totalInteractions,
    followsFromMedia: snapshot.followsFromMedia,
    profileVisits: snapshot.profileVisits,
    reactionsByType: snapshot.reactionsByType,
    profileActivity: snapshot.profileActivity,
    raw: snapshot.raw,
    metricAvailability: snapshot.metricAvailability,
    source: snapshot.source ?? null,
  }));
  const payload = asPayloadRecord(signal.payload);
  const evidence = getEvidence(payload);
  const riskScore = getRiskScore(payload);
  const confidence = getString(payload, "confidence");
  const topReason = translateSignalText(
    getReasons(payload)[0] ?? getString(payload, "reason") ?? "Bekijk deze waarschuwing voordat je beslist.",
  );
  const audienceCountries = parseAudienceCountries(audienceSnapshot?.topCountries);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Signaalbeoordeling"
        title="Botverdenking details"
        description="Dit is beoordelingsbewijs, geen automatisch fraude-oordeel. Vergelijk de post met andere gemeten posts van dezelfde maker voordat je afwijst."
        actions={[
          { label: "Terug naar campagne", href: `/admin/campaigns/${submission.campaignId}` },
          { label: "Post openen", href: submission.postUrl },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-950">
            {signal.resolvedBy === AUTO_ANTIBOT_RESOLVED_BY
              ? "Deze waarschuwing is automatisch opgelost"
              : signal.resolvedAt
                ? "Deze waarschuwing is opgelost"
                : "Open waarschuwing"}
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {signal.resolvedBy === AUTO_ANTIBOT_RESOLVED_BY
              ? "Een nieuwe anti-bot herberekening kwam onder de risicodrempel. Als dezelfde maker later opnieuw verdacht gedrag vertoont, maakt de poller weer een nieuw signaal aan."
              : "Oplossen verbergt dit signaal uit de open lijst. Als dezelfde maker later opnieuw verdacht gedrag vertoont, maakt de poller weer een nieuw signaal aan."}
          </p>
        </div>
        <SignalResolveButton signalId={signal.id} resolved={Boolean(signal.resolvedAt)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Risicoscore" value={riskScore == null ? "-" : `${riskScore}/100`} detail={confidence ? `${confidenceLabel(confidence)} vertrouwen` : "Geen vertrouwen opgeslagen"} tone={riskScore != null && riskScore >= 70 ? "danger" : "warning"} />
        <StatCard label="Totale views" value={formatNumber(currentViews)} detail="Laatste meting" />
        <StatCard label="Engagement" value={currentEngagements == null ? "Niet beschikbaar" : formatNumber(currentEngagements)} detail={formatRate(currentEngagements == null ? null : engagementRate(currentEngagements, currentViews))} />
      </div>

      <AudienceRiskPanel
        countries={audienceCountries}
        capturedAt={audienceSnapshot?.capturedAt ?? null}
        source={audienceSnapshot?.source ?? null}
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Viewgroei per tijdvak</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Balken tonen gemeten groei binnen vaste tijdvakken; de eerste gemeten stand staat apart.
              </p>
            </div>
            <Badge variant={signal.severity === "CRITICAL" ? "failed" : "pending"}>{severityLabel(signal.severity)}</Badge>
          </div>
          <SignalViewGrowthChart snapshots={chartSnapshots} signalReason={topReason} />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Waarom gemarkeerd</p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-950">{topReason}</h2>
          <div className="mt-5 space-y-3">
            {evidence.length > 0 ? (
              evidence.map((item) => <EvidenceCard key={`${item.kind}-${item.label}`} item={item} />)
            ) : (
              <p className="text-sm leading-6 text-neutral-500">Er is geen gestructureerd anti-bot bewijs opgeslagen voor dit signaal.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AudienceRiskPanel({
  countries,
  capturedAt,
  source,
}: {
  countries: AudienceCountryShare[];
  capturedAt: Date | null;
  source: DemographicSource | null;
}) {
  const rows = countries
    .map((country) => ({
      ...country,
      sharePercent: audienceSharePercent(country.share),
      asian: isAsianCountry(country.code),
    }))
    .filter((country) => country.sharePercent > 0)
    .sort((a, b) => b.sharePercent - a.sharePercent);
  const audienceRisk = calculateAsianAudienceRisk(countries);

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-[#fbfaf7] shadow-[0_18px_55px_-40px_rgba(23,23,23,0.45)]">
      <div className="grid gap-6 border-b border-neutral-200 px-5 py-6 md:px-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
            <Globe2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">Page audience</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-neutral-950">Waar zitten de kijkers?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Landverdeling van het accountpubliek. Elk procentpunt uit een Aziatisch land voegt {ASIAN_AUDIENCE_POINTS_PER_PERCENT} punten toe aan de botrisicoscore.
            </p>
            {capturedAt ? (
              <p className="mt-3 text-xs text-neutral-400">
                Laatste audience-meting: {capturedAt.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                {source ? ` · ${audienceSourceLabel(source)}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className={`rounded-2xl p-5 ${audienceRisk.riskPoints > 0 ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-950"}`}>
          <div className="flex items-center justify-between gap-4">
            <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${audienceRisk.riskPoints > 0 ? "text-orange-300" : "text-neutral-400"}`}>
              Azië-impact
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${audienceRisk.riskPoints > 0 ? "bg-orange-400/15 text-orange-200" : "bg-emerald-50 text-emerald-700"}`}>
              {formatAudiencePercent(audienceRisk.asianSharePercent)} van audience
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
            +{formatAudiencePoints(audienceRisk.riskPoints)} punten
          </p>
          <p className={`mt-2 text-xs leading-5 ${audienceRisk.riskPoints > 0 ? "text-neutral-400" : "text-neutral-500"}`}>
            Wordt opgeteld bij de overige signalen. De totale risicoscore blijft begrensd op 100.
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-x-8 gap-y-5 px-5 py-6 md:grid-cols-2 md:px-7">
          {rows.map((country) => {
            const countryRiskPoints = country.asian
              ? country.sharePercent * ASIAN_AUDIENCE_POINTS_PER_PERCENT
              : 0;
            return (
              <div key={country.code} className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 min-w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-bold tracking-[0.08em] text-neutral-700">
                      {country.code}
                    </span>
                    <span className="truncate text-sm font-semibold text-neutral-900">{countryName(country.code)}</span>
                    {country.asian ? (
                      <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-orange-800">
                        Azië
                      </span>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums text-neutral-950">{formatAudiencePercent(country.sharePercent)}</span>
                    {countryRiskPoints > 0 ? (
                      <span className="ml-2 text-xs font-semibold tabular-nums text-orange-700">+{formatAudiencePoints(countryRiskPoints)} ptn</span>
                    ) : null}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className={`h-full rounded-full ${country.asian ? "bg-orange-500" : "bg-neutral-900"}`}
                    style={{ width: `${Math.min(100, country.sharePercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center md:px-7">
          <p className="text-sm font-semibold text-neutral-900">Geen audience-landen beschikbaar</p>
          <p className="mt-2 text-sm text-neutral-500">Voor dit gekoppelde account is nog geen bruikbare landenverdeling opgeslagen.</p>
        </div>
      )}
    </section>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-950">{translateSignalText(item.label)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">{evidenceKindLabel(item.kind)}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700">{item.points} ptn</span>
      </div>
      {Object.keys(item.metrics).length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(item.metrics).map(([key, value]) => (
            <div key={key}>
              <dt className="text-[11px] text-neutral-400">{metricLabel(key)}</dt>
              <dd className="text-xs font-semibold text-neutral-800">{formatMetricValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function latestSnapshot<T>(snapshots: T[]): T | null {
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

function engagementRate(engagements: number, views: number) {
  if (views <= 0) return null;
  return (engagements / views) * 100;
}

function snapshotEngagements(snapshot: SnapshotPoint): number | null {
  const values = [
    metricCount(snapshot, "likes", "likeCount"),
    metricCount(snapshot, "comments", "commentCount"),
    metricCount(snapshot, "shares", "shareCount"),
    metricCount(snapshot, "saves", "saveCount"),
  ].filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function metricCount(
  snapshot: SnapshotPoint,
  key: MetricAvailabilityKey,
  field: "likeCount" | "commentCount" | "shareCount" | "saveCount",
): number | null {
  const explicit = metricAvailabilityValue(snapshot.metricAvailability, key);
  if (explicit === false) return null;
  const value = snapshot[field];
  if (explicit === true) return value ?? 0;
  if (key === "saves") return value;
  return value ?? 0;
}

function legacyEngagements(row: {
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
}) {
  const values = [row.likeCount, row.commentCount, row.shareCount].filter(
    (value): value is number => value != null,
  );
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function asPayloadRecord(payload: Prisma.JsonValue): PayloadRecord | null {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as PayloadRecord : null;
}

function getRiskScore(payload: PayloadRecord | null) {
  const risk = payload?.riskScore;
  return typeof risk === "number" && Number.isFinite(risk) ? risk : null;
}

function getString(payload: PayloadRecord | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
}

function getReasons(payload: PayloadRecord | null) {
  const reasons = payload?.reasons;
  return Array.isArray(reasons) ? reasons.filter((item): item is string => typeof item === "string") : [];
}

function getEvidence(payload: PayloadRecord | null): EvidenceItem[] {
  const evidence = payload?.evidence;
  if (!Array.isArray(evidence)) return [];
  return evidence.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as PayloadRecord;
    const label = typeof record.label === "string" ? record.label : null;
    const kind = typeof record.kind === "string" ? record.kind : "UNKNOWN";
    const points = typeof record.points === "number" && Number.isFinite(record.points) ? record.points : 0;
    const metrics = record.metrics && typeof record.metrics === "object" && !Array.isArray(record.metrics)
      ? sanitizeMetrics(record.metrics as PayloadRecord)
      : {};
    return label ? [{ kind, label, points, metrics }] : [];
  });
}

function sanitizeMetrics(metrics: PayloadRecord) {
  return Object.fromEntries(
    Object.entries(metrics).filter((entry): entry is [string, number | string | null] => {
      const value = entry[1];
      return value == null || typeof value === "number" || typeof value === "string";
    }),
  );
}

function translateSignalText(value: string) {
  const translations: Record<string, string> = {
    "High view growth with near-zero comments and shares": "Hoge viewgroei met bijna geen reacties en shares",
    "High view growth with near-zero available engagement": "Hoge viewgroei met bijna geen beschikbare engagement",
    "Views are high relative to the tracked account audience": "Views zijn hoog ten opzichte van de gemeten accountgrootte",
    "View growth above campaign benchmark": "Viewgroei boven de campagnebenchmark",
    "View growth anomaly against submission history": "Ongebruikelijke viewgroei ten opzichte van eerdere metingen",
    "Extreme view growth anomaly against submission history": "Extreme viewgroei ten opzichte van eerdere metingen",
    "Like ratio is unusually high for the view count": "Like-ratio is ongewoon hoog voor dit aantal views",
    "Good cumulative engagement lowers bot risk": "Gezonde engagement verlaagt het botrisico",
    "Audience is concentrated in Asian countries": "Audience is sterk geconcentreerd in Aziatische landen",
    "low engagement on high view delta": "Lage engagement bij hoge viewgroei",
  };
  if (translations[value]) return translations[value];
  return value
    .replace("Anti-bot risk", "Anti-bot risico")
    .replace("View growth anomaly", "Ongebruikelijke viewgroei")
    .replace("Engagement collapse", "Engagementdaling")
    .replace("Views exceed account audience", "Views liggen boven de accountgrootte")
    .replace("Token expired", "Token verlopen");
}

function severityLabel(severity: string) {
  if (severity === "CRITICAL") return "Kritiek";
  if (severity === "WARN") return "Waarschuwing";
  if (severity === "INFO") return "Info";
  return titleCaseEnum(severity);
}

function confidenceLabel(confidence: string) {
  if (confidence === "HIGH") return "hoog";
  if (confidence === "MEDIUM") return "gemiddeld";
  if (confidence === "LOW") return "laag";
  return confidence.toLowerCase();
}

function evidenceKindLabel(kind: string) {
  const labels: Record<string, string> = {
    VELOCITY_ANOMALY: "Snelheidsafwijking",
    ENGAGEMENT_COLLAPSE: "Engagementdaling",
    AUDIENCE_MISMATCH: "Publieksafwijking",
    CAMPAIGN_BENCHMARK: "Campagnebenchmark",
    LIKE_RATIO: "Like-ratio",
    HEALTHY_ENGAGEMENT: "Gezonde engagement",
    AUDIENCE_GEO: "Audience-landen",
  };
  return labels[kind] ?? titleCaseEnum(kind);
}

function metricLabel(key: string) {
  const labels: Record<string, string> = {
    viewsPerHour: "Views per uur",
    rolling7dMean: "7d gemiddelde",
    spikeMultiplier: "Spikefactor",
    campaignVelocityP90: "Campagne p90",
    campaignRatio: "Campagneratio",
    deltaViews: "Viewgroei",
    deltaCommentRatio: "Reactieratio",
    deltaShareRatio: "Shareratio",
    deltaSaveRatio: "Saveratio",
    deltaEngagements: "Engagementgroei",
    deltaEngagementRatio: "Engagementratio",
    engagementRate: "Engagementrate",
    availableMetrics: "Beschikbare metrics",
    likeRatio: "Like-ratio",
    audienceCount: "Accountgrootte",
    audienceMultiple: "Publieksfactor",
    asianAudiencePercent: "Audience uit Azië",
    pointsPerPercent: "Punten per procent",
    asianCountries: "Aziatische landen",
  };
  return labels[key] ?? titleCaseEnum(key);
}

function formatMetricValue(value: number | string | null) {
  if (value == null) return "Niet beschikbaar";
  if (typeof value === "number") return Number.isInteger(value) ? formatNumber(value) : value.toLocaleString("nl-NL", { maximumFractionDigits: 3 });
  return value;
}

function formatRate(value: number | null) {
  return value == null ? "Niet beschikbaar" : `${value.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}% engagement`;
}

function formatAudiencePercent(value: number) {
  return `${value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;
}

function formatAudiencePoints(value: number) {
  return value.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["nl"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function audienceSourceLabel(source: DemographicSource) {
  return source === "PLATFORM_API" ? "platformdata" : "handmatig geverifieerd";
}

