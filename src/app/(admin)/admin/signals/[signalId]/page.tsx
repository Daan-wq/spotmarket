import type { BioPlatform, ConnectionType, Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { formatDate, formatNumber, titleCaseEnum } from "@/lib/admin/agency-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ signalId: string }>;
}

type SnapshotPoint = {
  capturedAt: Date;
  viewCount: bigint;
  likeCount: number;
  commentCount: number;
  shareCount: number;
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
  latestEngagements: number;
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
              viewCount: true,
              likeCount: true,
              commentCount: true,
              shareCount: true,
            },
          },
        },
      },
    },
  });

  if (!signal?.submission) return notFound();

  const submission = signal.submission;
  const snapshots = [...submission.metricSnapshots].reverse();
  const latest = latestSnapshot(snapshots);
  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const currentViews = latest ? Number(latest.viewCount) : (submission.viewCount ?? submission.claimedViews);
  const currentEngagements = latest
    ? latest.likeCount + latest.commentCount + latest.shareCount
    : (submission.likeCount ?? 0) + (submission.commentCount ?? 0) + (submission.shareCount ?? 0);
  const currentVelocity = previous && latest ? viewsPerHour(previous, latest) : null;
  const payload = asPayloadRecord(signal.payload);
  const evidence = getEvidence(payload);
  const riskScore = getRiskScore(payload);
  const confidence = getString(payload, "confidence");
  const topReason = getReasons(payload)[0] ?? getString(payload, "reason") ?? "Review this signal before deciding.";

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
        eyebrow="Signal review"
        title="Bot suspicion details"
        description="This is evidence for review, not an automatic fraud verdict. Compare the flagged post with the creator's other tracked posts before rejecting."
        actions={[
          { label: "Back to campaign", href: `/admin/campaigns/${submission.campaignId}` },
          { label: "Open post", href: submission.postUrl },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard label="Risk score" value={riskScore == null ? "-" : `${riskScore}/100`} detail={confidence ? `${confidence} confidence` : "No confidence saved"} tone={riskScore != null && riskScore >= 70 ? "danger" : "warning"} />
        <StatCard label="Total views" value={formatNumber(currentViews)} detail="Latest tracked total" />
        <StatCard label="Engagement" value={formatNumber(currentEngagements)} detail={formatRate(engagementRate(currentEngagements, currentViews))} />
        <StatCard label="Recent velocity" value={currentVelocity == null ? "-" : `${formatNumber(Math.round(currentVelocity))}/h`} detail="Between last two polls" />
        <StatCard label="Account median" value={medianViews == null ? "-" : formatNumber(Math.round(medianViews))} detail="Comparable videos" />
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">View spike timeline</h2>
              <p className="mt-1 text-sm text-neutral-500">
                View gain per poll for this submission. Large isolated bars are the spikes to inspect.
              </p>
            </div>
            <Badge variant={signal.severity === "CRITICAL" ? "failed" : "pending"}>{titleCaseEnum(signal.severity)}</Badge>
          </div>
          <DeltaBarChart snapshots={snapshots} />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Why it was flagged</p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-950">{topReason}</h2>
          <div className="mt-5 space-y-3">
            {evidence.length > 0 ? (
              evidence.map((item) => <EvidenceCard key={`${item.kind}-${item.label}`} item={item} />)
            ) : (
              <p className="text-sm leading-6 text-neutral-500">No structured anti-bot evidence was saved for this signal.</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Comparable videos"
          description={`Same creator${submission.sourcePlatform ? `, same platform (${titleCaseEnum(submission.sourcePlatform)})` : ""}. Use this to judge whether the spike is unusual for ${creatorName}.`}
        />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            <span>Video</span>
            <span className="text-right">Views</span>
            <span className="text-right">Eng.</span>
            <span className="text-right">Velocity</span>
            <span className="text-right">Vs median</span>
          </div>
          <ComparisonLine
            label="Flagged video"
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
                label={formatDate(row.createdAt)}
                href={row.postUrl}
                views={row.latestViews}
                engagements={row.latestEngagements}
                velocity={row.recentVelocity}
                medianViews={medianViews}
              />
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-neutral-500">No comparable tracked videos are available yet.</p>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Median velocity for comparable videos: {medianVelocity == null ? "-" : `${formatNumber(Math.round(medianVelocity))}/h`}.
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
        take: 2,
        select: {
          capturedAt: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
        },
      },
    },
  });

  return rows.map((row): ComparisonRow => {
    const ordered = [...row.metricSnapshots].reverse();
    const latest = latestSnapshot(ordered);
    const previous = ordered.length >= 2 ? ordered[ordered.length - 2] : null;
    const latestViews = latest ? Number(latest.viewCount) : (row.viewCount ?? row.claimedViews);
    const latestEngagements = latest
      ? latest.likeCount + latest.commentCount + latest.shareCount
      : (row.likeCount ?? 0) + (row.commentCount ?? 0) + (row.shareCount ?? 0);
    return {
      id: row.id,
      postUrl: row.postUrl,
      createdAt: row.createdAt,
      latestViews,
      latestEngagements,
      recentVelocity: previous && latest ? viewsPerHour(previous, latest) : null,
    };
  });
}

function DeltaBarChart({ snapshots }: { snapshots: SnapshotPoint[] }) {
  const deltas = snapshots.slice(1).map((snapshot, index) => {
    const previous = snapshots[index];
    const delta = Math.max(0, Number(snapshot.viewCount) - Number(previous.viewCount));
    return { capturedAt: snapshot.capturedAt, delta, views: Number(snapshot.viewCount) };
  });
  const maxDelta = Math.max(1, ...deltas.map((point) => point.delta));

  if (deltas.length === 0) {
    return <div className="flex h-56 items-center justify-center rounded-xl bg-neutral-50 text-sm text-neutral-500">Need at least two snapshots to show spikes.</div>;
  }

  return (
    <div>
      <div className="flex h-56 items-end gap-1 rounded-xl bg-neutral-50 px-3 py-3">
        {deltas.map((point) => {
          const height = Math.max(4, (point.delta / maxDelta) * 100);
          return (
            <div
              key={point.capturedAt.toISOString()}
              className="min-w-1 flex-1 rounded-t bg-neutral-950"
              style={{ height: `${height}%`, opacity: point.delta === maxDelta ? 1 : 0.45 }}
              title={`${formatDateTime(point.capturedAt)}: +${formatNumber(point.delta)} views (${formatNumber(point.views)} total)`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-xs text-neutral-500">
        <span>{formatDateTime(deltas[0].capturedAt)}</span>
        <span>Largest gain: +{formatNumber(maxDelta)}</span>
        <span>{formatDateTime(deltas[deltas.length - 1].capturedAt)}</span>
      </div>
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-950">{item.label}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">{titleCaseEnum(item.kind)}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700">{item.points} pts</span>
      </div>
      {Object.keys(item.metrics).length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(item.metrics).map(([key, value]) => (
            <div key={key}>
              <dt className="text-[11px] text-neutral-400">{titleCaseEnum(key)}</dt>
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
  engagements: number;
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
      <span className="text-right tabular-nums text-neutral-600">{formatNumber(engagements)}</span>
      <span className="text-right tabular-nums text-neutral-600">{velocity == null ? "-" : `${formatNumber(Math.round(velocity))}/h`}</span>
      <span className="text-right tabular-nums text-neutral-600">{vsMedian == null ? "-" : `${vsMedian.toFixed(1)}x`}</span>
    </div>
  );
}

function latestSnapshot<T>(snapshots: T[]): T | null {
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

function viewsPerHour(previous: SnapshotPoint, latest: SnapshotPoint) {
  const elapsedHours = (latest.capturedAt.getTime() - previous.capturedAt.getTime()) / (60 * 60 * 1000);
  if (elapsedHours <= 0) return 0;
  return Math.max(0, Number(latest.viewCount) - Number(previous.viewCount)) / elapsedHours;
}

function engagementRate(engagements: number, views: number) {
  if (views <= 0) return null;
  return (engagements / views) * 100;
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

function formatMetricValue(value: number | string | null) {
  if (value == null) return "-";
  if (typeof value === "number") return Number.isInteger(value) ? formatNumber(value) : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return value;
}

function formatRate(value: number | null) {
  return value == null ? "-" : `${value.toFixed(2)}% engagement rate`;
}

function formatDateTime(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
