import type { BioPlatform, ConnectionType, Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SignalResolveButton } from "@/components/admin/signal-resolve-button";
import { SignalViewGrowthChart } from "@/components/admin/signal-view-growth-chart";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { metricAvailabilityValue, type MetricAvailabilityKey } from "@/lib/contracts/metrics";
import { AUTO_ANTIBOT_RESOLVED_BY } from "@/lib/metrics/anti-bot-signal";
import { prisma } from "@/lib/prisma";
import { viewsPerHourFromLatestValidPair } from "@/lib/stats/view-growth-buckets";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ signalId: string }>;
}

type SnapshotPoint = {
  capturedAt: Date;
  source: string;
  viewCount: bigint;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number | null;
  metricAvailability: Prisma.JsonValue | null;
};

type PayloadRecord = Record<string, unknown>;

type EvidenceItem = {
  kind: string;
  label: string;
  points: number;
  metrics: Record<string, number | string | null>;
};

type ComparisonRow = {
  id: string;
  postUrl: string;
  createdAt: Date;
  latestViews: number;
  latestEngagements: number | null;
  recentVelocity: number | null;
};

export default async function SignalDetailPage({ params }: PageProps) {
  const { signalId } = await params;

  const signal = await prisma.submissionSignal.findUnique({
    where: { id: signalId },
    include: {
      submission: {
        include: {
          campaign: { select: { id: true, name: true } },
          creator: {
            select: {
              email: true,
              creatorProfile: { select: { id: true, displayName: true } },
            },
          },
          metricSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 96,
            select: {
              capturedAt: true,
              source: true,
              viewCount: true,
              likeCount: true,
              commentCount: true,
              shareCount: true,
              saveCount: true,
              metricAvailability: true,
            },
          },
        },
      },
    },
  });

  if (!signal?.submission) return notFound();

  const submission = signal.submission;
  const snapshots = [...submission.metricSnapshots].reverse();
  const latest = latestSnapshot(snapshots.filter((snapshot) => snapshot.source !== "OAUTH_FAILED"));
  const currentViews = latest ? Number(latest.viewCount) : (submission.viewCount ?? submission.claimedViews);
  const currentEngagements = latest
    ? snapshotEngagements(latest)
    : legacyEngagements(submission);
  const currentVelocity = viewsPerHourFromLatestValidPair(snapshots);
  const chartSnapshots = snapshots.map((snapshot) => ({
    capturedAt: snapshot.capturedAt.toISOString(),
    viewCount: Number(snapshot.viewCount),
    source: snapshot.source,
  }));
  const payload = asPayloadRecord(signal.payload);
  const evidence = getEvidence(payload);
  const riskScore = getRiskScore(payload);
  const confidence = getString(payload, "confidence");
  const topReason = translateSignalText(
    getReasons(payload)[0] ?? getString(payload, "reason") ?? "Bekijk deze waarschuwing voordat je beslist.",
  );

  const comparisonRows = await loadComparisonRows(submission);
  const comparisonViews = comparisonRows.map((row) => row.latestViews).filter((value) => value > 0);
  const comparisonVelocity = comparisonRows
    .map((row) => row.recentVelocity)
    .filter((value): value is number => value != null && value >= 0);
  const medianViews = median(comparisonViews);
  const medianVelocity = median(comparisonVelocity);
  const creatorName = submission.creator.creatorProfile?.displayName ?? submission.creator.email;

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard label="Risicoscore" value={riskScore == null ? "-" : `${riskScore}/100`} detail={confidence ? `${confidenceLabel(confidence)} vertrouwen` : "Geen vertrouwen opgeslagen"} tone={riskScore != null && riskScore >= 70 ? "danger" : "warning"} />
        <StatCard label="Totale views" value={formatNumber(currentViews)} detail="Laatste meting" />
        <StatCard label="Engagement" value={currentEngagements == null ? "Niet beschikbaar" : formatNumber(currentEngagements)} detail={formatRate(currentEngagements == null ? null : engagementRate(currentEngagements, currentViews))} />
        <StatCard label="Recente snelheid" value={currentVelocity == null ? "-" : `${formatNumber(Math.round(currentVelocity))}/u`} detail="Tussen laatste twee metingen" />
        <StatCard label="Accountmediaan" value={medianViews == null ? "-" : formatNumber(Math.round(medianViews))} detail="Vergelijkbare videos" />
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Viewgroei per tijdvak</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Elke balk toont de geschatte viewgroei binnen hetzelfde vaste tijdvak.
              </p>
            </div>
            <Badge variant={signal.severity === "CRITICAL" ? "failed" : "pending"}>{severityLabel(signal.severity)}</Badge>
          </div>
          <SignalViewGrowthChart snapshots={chartSnapshots} />
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

      <section>
        <SectionHeader
          title="Vergelijkbare videos"
          description={`Dezelfde maker${submission.sourcePlatform ? `, hetzelfde platform (${titleCaseEnum(submission.sourcePlatform)})` : ""}. Gebruik dit om te beoordelen of de groei ongewoon is voor ${creatorName}.`}
        />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            <span>Video</span>
            <span className="text-right">Views</span>
            <span className="text-right">Eng.</span>
            <span className="text-right">Snelheid</span>
            <span className="text-right">T.o.v. mediaan</span>
          </div>
          <ComparisonLine
            label="Gemarkeerde video"
            href={submission.postUrl}
            views={currentViews}
            engagements={currentEngagements}
            velocity={currentVelocity}
            medianViews={medianViews}
            highlighted
          />
          {comparisonRows.length > 0 ? (
            comparisonRows.map((row) => (
              <ComparisonLine
                key={row.id}
                label={formatDate(row.createdAt, "nl")}
                href={row.postUrl}
                views={row.latestViews}
                engagements={row.latestEngagements}
                velocity={row.recentVelocity}
                medianViews={medianViews}
              />
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-neutral-500">Er zijn nog geen vergelijkbare gemeten videos beschikbaar.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Mediaansnelheid voor vergelijkbare videos: {medianVelocity == null ? "-" : `${formatNumber(Math.round(medianVelocity))}/u`}.
        </p>
      </section>
    </div>
  );
}

async function loadComparisonRows(submission: {
  id: string;
  creatorId: string;
  sourcePlatform: BioPlatform | null;
  sourceConnectionType: ConnectionType | null;
  sourceConnectionId: string | null;
}) {
  const where: Prisma.CampaignSubmissionWhereInput = {
    creatorId: submission.creatorId,
    id: { not: submission.id },
    metricSnapshots: { some: {} },
  };

  if (submission.sourceConnectionType && submission.sourceConnectionId) {
    where.sourceConnectionType = submission.sourceConnectionType;
    where.sourceConnectionId = submission.sourceConnectionId;
  } else if (submission.sourcePlatform) {
    where.sourcePlatform = submission.sourcePlatform;
  }

  const rows = await prisma.campaignSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      postUrl: true,
      createdAt: true,
      viewCount: true,
      claimedViews: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      metricSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 5,
        select: {
          capturedAt: true,
          source: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          saveCount: true,
          metricAvailability: true,
        },
      },
    },
  });

  return rows.map((row): ComparisonRow => {
    const ordered = [...row.metricSnapshots].reverse();
    const latest = latestSnapshot(ordered.filter((snapshot) => snapshot.source !== "OAUTH_FAILED"));
    const latestViews = latest ? Number(latest.viewCount) : (row.viewCount ?? row.claimedViews);
    const latestEngagements = latest
      ? snapshotEngagements(latest)
      : legacyEngagements(row);
    return {
      id: row.id,
      postUrl: row.postUrl,
      createdAt: row.createdAt,
      latestViews,
      latestEngagements,
      recentVelocity: viewsPerHourFromLatestValidPair(ordered),
    };
  });
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

function ComparisonLine({
  label,
  href,
  views,
  engagements,
  velocity,
  medianViews,
  highlighted = false,
}: {
  label: string;
  href: string;
  views: number;
  engagements: number | null;
  velocity: number | null;
  medianViews: number | null;
  highlighted?: boolean;
}) {
  const vsMedian = medianViews && medianViews > 0 ? views / medianViews : null;
  return (
    <div className={`grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 ${highlighted ? "bg-orange-50/60" : ""}`}>
      <Link href={href} target="_blank" className="truncate font-semibold text-neutral-950 underline-offset-2 hover:underline">
        {label}
      </Link>
      <span className="text-right font-semibold tabular-nums text-neutral-950">{formatNumber(views)}</span>
      <span className="text-right tabular-nums text-neutral-600">{engagements == null ? "Niet beschikbaar" : formatNumber(engagements)}</span>
      <span className="text-right tabular-nums text-neutral-600">{velocity == null ? "-" : `${formatNumber(Math.round(velocity))}/u`}</span>
      <span className="text-right tabular-nums text-neutral-600">{vsMedian == null ? "-" : `${vsMedian.toFixed(1)}x`}</span>
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

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
