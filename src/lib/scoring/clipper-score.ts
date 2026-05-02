/**
 * Clipper Performance Score — composite 0..100, recomputed nightly.
 *
 * Owner: Subsystem B (Performance Intelligence).
 *
 * Inputs (Prisma reads only — no cross-subsystem imports):
 *   - CampaignSubmission (last 90d) — approval rate, eligible-views, on-time
 *   - SubmissionSignal of type BOT_SUSPECTED — trust score
 *   - CampaignBenchmark.velocityP50 — benchmark ratio
 *   - AudienceSnapshot for the creator's connections — audience fit
 *   - Campaign target demo fields — audience fit comparison
 *
 * Components, all 0..100:
 *   - approvalRate    weight 0.20
 *   - benchmarkRatio  weight 0.30
 *   - trustScore      weight 0.20
 *   - deliveryScore   weight 0.15
 *   - audienceFit     weight 0.15
 *
 * Output: ClipperPerformanceScore row + `clipper.score.recomputed` event.
 */

import type { ClipperPerformanceScore } from "@/lib/contracts/scores";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/event-bus";

const WINDOW_DAYS = 90;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const SCORE_WEIGHTS = {
  approvalRate: 0.2,
  benchmarkRatio: 0.3,
  trustScore: 0.2,
  deliveryScore: 0.15,
  audienceFit: 0.15,
} as const;

export interface ScoreComponents {
  approvalRate: number;
  benchmarkRatio: number;
  trustScore: number;
  deliveryScore: number;
  audienceFit: number;
  sampleSize: number;
}

export function clamp01to100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function compositeScore(c: ScoreComponents): number {
  const raw =
    c.approvalRate * SCORE_WEIGHTS.approvalRate +
    c.benchmarkRatio * SCORE_WEIGHTS.benchmarkRatio +
    c.trustScore * SCORE_WEIGHTS.trustScore +
    c.deliveryScore * SCORE_WEIGHTS.deliveryScore +
    c.audienceFit * SCORE_WEIGHTS.audienceFit;
  return clamp01to100(raw);
}

/**
 * Audience fit: simple symmetric similarity between campaign target demo
 * and the average AudienceSnapshot for the creator. Returns 0..100.
 *
 * Heuristic — for each axis (top country share, male share, age 18+ share)
 * if a campaign target is set we compute (1 - |target - actual|) * 100,
 * floor at 0. Average over the axes that have a target. If no axis has
 * a target, return 75 as a neutral default.
 */
export function audienceFitScore(
  target: {
    targetCountry?: string | null;
    targetCountryPercent?: number | null;
    targetMinAge18Percent?: number | null;
    targetMalePercent?: number | null;
  },
  actual: {
    topCountry?: string | null;
    topCountryPercent?: number | null;
    age18PlusPercent?: number | null;
    malePercent?: number | null;
  }
): number {
  const parts: number[] = [];

  if (target.targetCountry && target.targetCountryPercent != null) {
    const targetShare = target.targetCountryPercent / 100;
    const actualShare =
      actual.topCountry && actual.topCountry === target.targetCountry
        ? (actual.topCountryPercent ?? 0) / 100
        : 0;
    parts.push((1 - Math.abs(targetShare - actualShare)) * 100);
  }

  if (target.targetMinAge18Percent != null && actual.age18PlusPercent != null) {
    const t = target.targetMinAge18Percent / 100;
    const a = actual.age18PlusPercent / 100;
    // Reward exceeding the minimum: cap diff at 0 when actual >= target.
    const diff = a >= t ? 0 : t - a;
    parts.push((1 - diff) * 100);
  }

  if (target.targetMalePercent != null && actual.malePercent != null) {
    const t = target.targetMalePercent / 100;
    const a = actual.malePercent / 100;
    parts.push((1 - Math.abs(t - a)) * 100);
  }

  if (parts.length === 0) return 75;
  const avg = parts.reduce((s, x) => s + x, 0) / parts.length;
  return clamp01to100(avg);
}

interface RawCreatorData {
  creatorProfileId: string;
  userId: string;
}

/**
 * Compute components for one creator. All five components are 0..100.
 *
 * `sampleSize` reflects the number of submissions in the 90-day window;
 * we don't gate on a minimum but downstream code may decide to skip
 * very-low-sample creators.
 */
export async function computeScoreComponents(
  creator: RawCreatorData
): Promise<ScoreComponents> {
  const since = new Date(Date.now() - WINDOW_MS);

  // ── Approval rate ───────────────────────────────────────────────
  const submissions = await prisma.campaignSubmission.findMany({
    where: {
      creatorId: creator.userId,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      status: true,
      eligibleViews: true,
      campaignId: true,
      createdAt: true,
      reviewedAt: true,
      campaign: {
        select: {
          id: true,
          deadline: true,
          targetCountry: true,
          targetCountryPercent: true,
          targetMinAge18Percent: true,
          targetMalePercent: true,
        },
      },
    },
  });

  const sampleSize = submissions.length;

  let approvalRate = 50; // neutral default with no data
  if (sampleSize > 0) {
    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    approvalRate = (approved / sampleSize) * 100;
  }

  // ── Benchmark ratio: avg(eligibleViews / camp velocityP50 * window) ─
  // Pragmatic comparison: for each submission compare its eligibleViews
  // to the latest CampaignBenchmark for that campaign. Map ratio→score
  // via a saturating curve: ratio 0 → 0, 1 → 50, 2+ → 100.
  let benchmarkRatio = 50;
  if (sampleSize > 0) {
    const campaignIds = Array.from(new Set(submissions.map((s) => s.campaignId)));
    const benchmarks = await prisma.campaignBenchmark.findMany({
      where: { campaignId: { in: campaignIds } },
      orderBy: { computedAt: "desc" },
      select: {
        campaignId: true,
        velocityP50: true,
        windowHours: true,
        computedAt: true,
      },
    });
    const latestByCampaign = new Map<string, (typeof benchmarks)[number]>();
    for (const b of benchmarks) {
      if (!latestByCampaign.has(b.campaignId)) latestByCampaign.set(b.campaignId, b);
    }

    const ratios: number[] = [];
    for (const sub of submissions) {
      const bench = latestByCampaign.get(sub.campaignId);
      if (!bench || bench.velocityP50 <= 0) continue;
      const expected = bench.velocityP50 * bench.windowHours;
      if (expected <= 0) continue;
      const observed = sub.eligibleViews ?? 0;
      ratios.push(observed / expected);
    }
    if (ratios.length > 0) {
      const avg = ratios.reduce((s, x) => s + x, 0) / ratios.length;
      benchmarkRatio = clamp01to100(Math.min(2, avg) * 50);
    }
  }

  // ── Trust score: 1 - bot-flag rate over creator's submissions ─────
  let trustScore = 100;
  if (sampleSize > 0) {
    const submissionIds = submissions.map((s) => s.id);
    const botFlagged = await prisma.submissionSignal.count({
      where: {
        submissionId: { in: submissionIds },
        type: "BOT_SUSPECTED",
      },
    });
    const flaggedSubs = await prisma.submissionSignal.findMany({
      where: {
        submissionId: { in: submissionIds },
        type: "BOT_SUSPECTED",
      },
      distinct: ["submissionId"],
      select: { submissionId: true },
    });
    void botFlagged;
    const botRate = flaggedSubs.length / sampleSize;
    trustScore = clamp01to100((1 - botRate) * 100);
  }

  // ── Delivery score: on-time rate (submitted before campaign deadline) ─
  let deliveryScore = 100;
  if (sampleSize > 0) {
    const onTime = submissions.filter((s) => {
      const d = s.campaign?.deadline;
      if (!d) return true; // no deadline → counts as on-time
      return s.createdAt.getTime() <= d.getTime();
    }).length;
    deliveryScore = (onTime / sampleSize) * 100;
  }

  // ── Audience fit: average per-submission target/actual alignment ───
  let audienceFit = 75;
  if (sampleSize > 0) {
    // Pull the creator profile + most recent audience aggregate fields once.
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: creator.creatorProfileId },
      select: {
        topCountry: true,
        topCountryPercent: true,
        age18PlusPercent: true,
        malePercent: true,
      },
    });
    if (profile) {
      const fits = submissions.map((s) =>
        audienceFitScore(
          {
            targetCountry: s.campaign?.targetCountry,
            targetCountryPercent: s.campaign?.targetCountryPercent,
            targetMinAge18Percent: s.campaign?.targetMinAge18Percent,
            targetMalePercent: s.campaign?.targetMalePercent,
          },
          profile
        )
      );
      audienceFit = fits.reduce((s, x) => s + x, 0) / fits.length;
    }
  }

  return {
    approvalRate: clamp01to100(approvalRate),
    benchmarkRatio: clamp01to100(benchmarkRatio),
    trustScore: clamp01to100(trustScore),
    deliveryScore: clamp01to100(deliveryScore),
    audienceFit: clamp01to100(audienceFit),
    sampleSize,
  };
}

/** Compute + persist a ClipperPerformanceScore for one creator. */
export async function recomputeClipperScore(
  creatorProfileId: string
): Promise<ClipperPerformanceScore | null> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { id: true, userId: true },
  });
  if (!profile) return null;

  const components = await computeScoreComponents({
    creatorProfileId: profile.id,
    userId: profile.userId,
  });

  // Skip creators with no submissions in window — no signal to score.
  if (components.sampleSize === 0) return null;

  const score = compositeScore(components);

  const row = await prisma.clipperPerformanceScore.create({
    data: {
      creatorProfileId,
      score,
      approvalRate: components.approvalRate,
      benchmarkRatio: components.benchmarkRatio,
      trustScore: components.trustScore,
      deliveryScore: components.deliveryScore,
      audienceFit: components.audienceFit,
      sampleSize: components.sampleSize,
    },
  });

  await publishEvent({
    type: "clipper.score.recomputed",
    creatorProfileId,
    scoreId: row.id,
    score: row.score,
    occurredAt: new Date().toISOString(),
  });

  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId,
    computedAt: row.computedAt,
    score: row.score,
    approvalRate: row.approvalRate,
    benchmarkRatio: row.benchmarkRatio,
    trustScore: row.trustScore,
    deliveryScore: row.deliveryScore,
    audienceFit: row.audienceFit,
    sampleSize: row.sampleSize,
  };
}

/** Recompute scores for every creator with submissions in window. */
export async function recomputeAllClipperScores(): Promise<{
  creators: number;
  written: number;
  skipped: number;
}> {
  const since = new Date(Date.now() - WINDOW_MS);

  // Active creators = users with at least one submission in window.
  const recent = await prisma.campaignSubmission.findMany({
    where: { createdAt: { gte: since } },
    distinct: ["creatorId"],
    select: {
      creator: {
        select: {
          creatorProfile: { select: { id: true } },
        },
      },
    },
  });

  const profileIds = Array.from(
    new Set(
      recent
        .map((r) => r.creator.creatorProfile?.id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let written = 0;
  let skipped = 0;
  for (const id of profileIds) {
    try {
      const result = await recomputeClipperScore(id);
      if (result) written++;
      else skipped++;
    } catch (err) {
      console.error("[clipper-score] failed", { creatorProfileId: id, err });
      skipped++;
    }
  }

  return { creators: profileIds.length, written, skipped };
}
