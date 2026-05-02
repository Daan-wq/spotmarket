/**
 * Synthetic verification harness for Subsystem B (Performance Intelligence).
 *
 * This is a self-contained .mjs because the worktree has no TS test runner
 * (no tsx / ts-node installed). The pure decision functions below are copied
 * verbatim from the TS source files. Whenever the source changes, this file
 * MUST be updated to match — `npx tsc --noEmit` and `npm run build` cover
 * the typed surfaces; this file only verifies decision-function arithmetic.
 *
 * Run: node scripts/test-intelligence.mjs
 *
 * Mirrors:
 *   - src/lib/benchmarks/campaign-benchmark.ts (percentile, viewsPerHourForSeries, computeBenchmarkStats)
 *   - src/lib/signals/viral-detector.ts (evaluateViral)
 *   - src/lib/signals/underperform-detector.ts (evaluateUnderperform)
 *   - src/lib/scoring/clipper-score.ts (compositeScore, audienceFitScore)
 */

// ── Mirrored pure functions ──────────────────────────────────────────────
function percentile(sorted, q) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const clamped = Math.min(1, Math.max(0, q));
  const idx = clamped * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

function viewsPerHourForSeries(snaps) {
  if (snaps.length < 2) return null;
  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const elapsedMs = last.capturedAt.getTime() - first.capturedAt.getTime();
  if (elapsedMs <= 0) return null;
  const hours = elapsedMs / 3600000;
  if (hours < 1) return null;
  const delta = Number(last.viewCount) - Number(first.viewCount);
  if (!Number.isFinite(delta) || delta < 0) return null;
  return delta / hours;
}

function computeBenchmarkStats({ snapshotsBySubmission }) {
  const velocities = [];
  const likeRatios = [];
  const commentRatios = [];
  for (const snaps of snapshotsBySubmission.values()) {
    if (snaps.length === 0) continue;
    const v = viewsPerHourForSeries(snaps);
    if (v !== null && Number.isFinite(v)) velocities.push(v);
    const last = snaps[snaps.length - 1];
    const views = Number(last.viewCount);
    if (views > 0) {
      likeRatios.push(last.likeCount / views);
      commentRatios.push(last.commentCount / views);
    }
  }
  velocities.sort((a, b) => a - b);
  likeRatios.sort((a, b) => a - b);
  commentRatios.sort((a, b) => a - b);
  return {
    velocityP10: percentile(velocities, 0.1),
    velocityP50: percentile(velocities, 0.5),
    velocityP90: percentile(velocities, 0.9),
    likeRatioP50: percentile(likeRatios, 0.5),
    likeRatioP90: percentile(likeRatios, 0.9),
    commentRatioP50: percentile(commentRatios, 0.5),
    commentRatioP90: percentile(commentRatios, 0.9),
    sampleSize: velocities.length,
  };
}

const VIRAL_MULTIPLIER = 2;
const VIRAL_WINDOW_HOURS = 48;
function evaluateViral(args) {
  const multiplier = args.multiplier ?? VIRAL_MULTIPLIER;
  const windowHours = args.windowHours ?? VIRAL_WINDOW_HOURS;
  const ageHours =
    (args.now.getTime() - args.submissionCreatedAt.getTime()) / 3600000;
  if (ageHours < 0 || ageHours > windowHours) return null;
  if (args.campaignVelocityP90 <= 0) return null;
  const threshold = args.campaignVelocityP90 * multiplier;
  if (args.observedViewsPerHour < threshold) return null;
  return args.observedViewsPerHour / args.campaignVelocityP90;
}

const UNDERPERFORM_AFTER_HOURS = 48;
const UNDERPERFORM_MAX_AGE_HOURS = 30 * 24;
function evaluateUnderperform(args) {
  const ageHours =
    (args.now.getTime() - args.submissionCreatedAt.getTime()) / 3600000;
  if (ageHours < UNDERPERFORM_AFTER_HOURS) return null;
  if (ageHours > UNDERPERFORM_MAX_AGE_HOURS) return null;
  const weak = [];
  if (
    args.observedViewsPerHour !== null &&
    args.campaignVelocityP10 > 0 &&
    args.observedViewsPerHour < args.campaignVelocityP10
  )
    weak.push("views");
  if (
    args.observedLikeRatio !== null &&
    args.campaignLikeRatioP50 > 0 &&
    args.observedLikeRatio < args.campaignLikeRatioP50 * 0.5
  )
    weak.push("likeRatio");
  if (
    args.observedCommentRatio !== null &&
    args.campaignCommentRatioP50 > 0 &&
    args.observedCommentRatio < args.campaignCommentRatioP50 * 0.5
  )
    weak.push("commentRatio");
  return weak;
}

const SCORE_WEIGHTS = {
  approvalRate: 0.2,
  benchmarkRatio: 0.3,
  trustScore: 0.2,
  deliveryScore: 0.15,
  audienceFit: 0.15,
};
function clamp01to100(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
function compositeScore(c) {
  return clamp01to100(
    c.approvalRate * SCORE_WEIGHTS.approvalRate +
      c.benchmarkRatio * SCORE_WEIGHTS.benchmarkRatio +
      c.trustScore * SCORE_WEIGHTS.trustScore +
      c.deliveryScore * SCORE_WEIGHTS.deliveryScore +
      c.audienceFit * SCORE_WEIGHTS.audienceFit
  );
}

function audienceFitScore(target, actual) {
  const parts = [];
  if (target.targetCountry && target.targetCountryPercent != null) {
    const ts = target.targetCountryPercent / 100;
    const as =
      actual.topCountry && actual.topCountry === target.targetCountry
        ? (actual.topCountryPercent ?? 0) / 100
        : 0;
    parts.push((1 - Math.abs(ts - as)) * 100);
  }
  if (target.targetMinAge18Percent != null && actual.age18PlusPercent != null) {
    const t = target.targetMinAge18Percent / 100;
    const a = actual.age18PlusPercent / 100;
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

// ── Assertions ────────────────────────────────────────────────────────────
let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok  :", msg);
  }
}
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// percentile
{
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert(approx(percentile(xs, 0.5), 5.5), "percentile p50 of 1..10 = 5.5");
  assert(approx(percentile(xs, 0.1), 1.9), "percentile p10 of 1..10 = 1.9");
  assert(approx(percentile(xs, 0.9), 9.1), "percentile p90 of 1..10 = 9.1");
  assert(percentile([], 0.5) === 0, "percentile of empty = 0");
  assert(percentile([42], 0.9) === 42, "percentile single-element = element");
}

// viewsPerHourForSeries
{
  const t0 = new Date("2026-05-01T00:00:00Z");
  const t10 = new Date("2026-05-01T10:00:00Z");
  const series = [
    { capturedAt: t0, viewCount: 1000n },
    { capturedAt: t10, viewCount: 11000n },
  ];
  assert(viewsPerHourForSeries(series) === 1000, "10h, +10k views = 1000/h");
  assert(viewsPerHourForSeries([]) === null, "empty series → null");
  assert(viewsPerHourForSeries([series[0]]) === null, "single snap → null");
  // <1h skipped:
  const t30m = new Date("2026-05-01T00:30:00Z");
  assert(
    viewsPerHourForSeries([
      { capturedAt: t0, viewCount: 0n },
      { capturedAt: t30m, viewCount: 1000n },
    ]) === null,
    "<1h elapsed → null"
  );
}

// computeBenchmarkStats with 10 ascending submissions
{
  const t0 = new Date("2026-05-01T00:00:00Z");
  const t1 = new Date("2026-05-01T10:00:00Z");
  const map = new Map();
  for (let i = 0; i < 10; i++) {
    map.set(`s${i}`, [
      { capturedAt: t0, viewCount: 0n, likeCount: 0, commentCount: 0 },
      {
        capturedAt: t1,
        viewCount: BigInt((i + 1) * 1000),
        likeCount: (i + 1) * 50,
        commentCount: (i + 1) * 5,
      },
    ]);
  }
  const stats = computeBenchmarkStats({ snapshotsBySubmission: map });
  assert(stats.sampleSize === 10, "10 submissions → sampleSize 10");
  assert(approx(stats.velocityP50, 550), `p50 velocity = ${stats.velocityP50}`);
  assert(approx(stats.velocityP10, 190), `p10 velocity = ${stats.velocityP10}`);
  assert(approx(stats.velocityP90, 910), `p90 velocity = ${stats.velocityP90}`);
  assert(approx(stats.likeRatioP50, 0.05), `likeRatioP50 = ${stats.likeRatioP50}`);
}

// evaluateViral
{
  const created = new Date("2026-05-01T00:00:00Z");
  const now = new Date("2026-05-01T10:00:00Z");
  const ratio = evaluateViral({
    submissionCreatedAt: created,
    observedViewsPerHour: 250,
    campaignVelocityP90: 100,
    now,
  });
  assert(ratio !== null && approx(ratio, 2.5), `viral ratio=${ratio}`);

  assert(
    evaluateViral({
      submissionCreatedAt: new Date("2026-04-25T00:00:00Z"),
      observedViewsPerHour: 1000,
      campaignVelocityP90: 100,
      now,
    }) === null,
    "outside 48h window → null"
  );

  assert(
    evaluateViral({
      submissionCreatedAt: created,
      observedViewsPerHour: 150,
      campaignVelocityP90: 100,
      now,
    }) === null,
    "150 < p90*2 = 200 → null"
  );
}

// evaluateUnderperform
{
  const created = new Date("2026-05-01T00:00:00Z");
  const now = new Date("2026-05-04T00:00:00Z");
  const weak = evaluateUnderperform({
    submissionCreatedAt: created,
    now,
    observedViewsPerHour: 5,
    observedLikeRatio: 0.001,
    observedCommentRatio: 0.0001,
    campaignVelocityP10: 20,
    campaignLikeRatioP50: 0.05,
    campaignCommentRatioP50: 0.005,
  });
  assert(
    Array.isArray(weak) &&
      weak.includes("views") &&
      weak.includes("likeRatio") &&
      weak.includes("commentRatio"),
    `weakDimensions=${JSON.stringify(weak)}`
  );

  assert(
    evaluateUnderperform({
      submissionCreatedAt: new Date("2026-05-03T12:00:00Z"),
      now,
      observedViewsPerHour: 5,
      observedLikeRatio: 0,
      observedCommentRatio: 0,
      campaignVelocityP10: 100,
      campaignLikeRatioP50: 0.05,
      campaignCommentRatioP50: 0.005,
    }) === null,
    "inside 48h grace → null"
  );

  const ok = evaluateUnderperform({
    submissionCreatedAt: created,
    now,
    observedViewsPerHour: 200,
    observedLikeRatio: 0.06,
    observedCommentRatio: 0.006,
    campaignVelocityP10: 20,
    campaignLikeRatioP50: 0.05,
    campaignCommentRatioP50: 0.005,
  });
  assert(Array.isArray(ok) && ok.length === 0, "performing well → []");
}

// compositeScore
{
  assert(
    compositeScore({
      approvalRate: 100,
      benchmarkRatio: 100,
      trustScore: 100,
      deliveryScore: 100,
      audienceFit: 100,
      sampleSize: 10,
    }) === 100,
    "all-100 composite = 100"
  );
  assert(
    compositeScore({
      approvalRate: 0,
      benchmarkRatio: 0,
      trustScore: 0,
      deliveryScore: 0,
      audienceFit: 0,
      sampleSize: 10,
    }) === 0,
    "all-zero composite = 0"
  );
  // Mixed — exact arithmetic check
  const mixed = compositeScore({
    approvalRate: 80,
    benchmarkRatio: 60,
    trustScore: 90,
    deliveryScore: 70,
    audienceFit: 50,
    sampleSize: 10,
  });
  // 80*.2 + 60*.3 + 90*.2 + 70*.15 + 50*.15 = 16+18+18+10.5+7.5 = 70
  assert(approx(mixed, 70), `mixed composite = ${mixed} (expected 70)`);
}

// audienceFitScore
{
  assert(
    approx(
      audienceFitScore(
        {
          targetCountry: "US",
          targetCountryPercent: 80,
          targetMinAge18Percent: 70,
          targetMalePercent: 60,
        },
        {
          topCountry: "US",
          topCountryPercent: 80,
          age18PlusPercent: 70,
          malePercent: 60,
        }
      ),
      100
    ),
    "perfect match = 100"
  );
  const wrong = audienceFitScore(
    { targetCountry: "US", targetCountryPercent: 80 },
    { topCountry: "BR", topCountryPercent: 90 }
  );
  assert(wrong < 30, `wrong-country fit = ${wrong}`);
  assert(audienceFitScore({}, {}) === 75, "no targets → 75");
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll assertions passed.");
