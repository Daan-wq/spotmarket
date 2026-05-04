# Charter B — Performance Intelligence

> Read `docs/agent-team/README.md` first. This charter assumes the foundation PR has merged. May start in parallel with A; consumes A's events but uses contracts (already locked) so can be developed in isolation with mock events.

## Goal

Turn A's metric stream into actionable signals (viral / underperform) and per-clipper performance scores.

## In scope

- **`ClipperPerformanceScore`** — rolling, weighted composite. Recomputed nightly via cron. Components (each 0..100, weights chosen pragmatically):
  - Approval rate (approved / total submissions, last 90d)
  - Benchmark ratio (avg eligible-views vs campaign p50, last 90d)
  - Trust score (1 - bot-flag rate, last 90d)
  - Delivery score (on-time submission rate vs campaign deadlines)
  - Audience fit (alignment of `AudienceSnapshot` with campaign target demo)
- **`CampaignBenchmark`** — per-campaign rolling p10/p50/p90 of view velocity, like-ratio, comment-ratio. Computed every 6h. Used as comparison set for viral/underperform detectors.
- **Viral detector** — subscribes to `submission.metrics.updated`. If observed `viewsPerHour` > campaign p90 × multiplier within first 48h → publish `submission.viral`.
- **Underperform detector** — opposite end. < campaign p10 after 48h → publish `submission.underperform` with `weakDimensions: ("views" | "likeRatio" | "commentRatio" | "watchTime")[]`.
- **Hook/thumbnail/edit diagnostic v1** — lightweight: cluster top performers' submissions by campaign, when underperforming submission is detected, payload includes which dimension(s) are weak. (Real CV diagnosis is out — not in this build.)

## Out of scope

- UI surfaces (D consumes via Prisma, C consumes via API endpoints D will build OR via direct Prisma read for clipper-self views)
- Notification delivery (E subscribes to `submission.viral` / `submission.underperform` events and dispatches)
- Storing thumbnails / running CV (no scraping; out forever)

## Critical files

| File | Purpose |
|---|---|
| `src/lib/scoring/clipper-score.ts` (new) | Compute `ClipperPerformanceScore` from Prisma data |
| `src/lib/benchmarks/campaign-benchmark.ts` (new) | Compute `CampaignBenchmark` rolling stats |
| `src/lib/signals/viral-detector.ts` (new) | Bus subscriber → publishes `submission.viral` |
| `src/lib/signals/underperform-detector.ts` (new) | Periodic + event-driven → publishes `submission.underperform` |
| `src/app/api/cron/recompute-scores/route.ts` (new) | Nightly cron — writes `ClipperPerformanceScore` rows |
| `src/app/api/cron/recompute-benchmarks/route.ts` (new) | Every 6h — writes `CampaignBenchmark` rows |
| `vercel.json` | Add the two new cron entries (coordinate with A — A owns the cron section) |

## Verification

1. **Unit** — feed synthetic `MetricSnapshot` time-series into the velocity computation, assert benchmark p50/p90 values.
2. **Hand-labeled set** — collect 20 known-viral and 20 known-flop submissions (post-A goes live). Run scoring + detectors offline. Assert ≥ 80% precision on viral detection at p90 × 2 multiplier.
3. **Integration** — fire a synthetic `submission.metrics.updated` event with high delta, assert `submission.viral` lands on the bus within 5s.
4. **Score recompute** — run nightly cron in dev, assert `ClipperPerformanceScore` rows for every active creator with submissions in the last 90d.

## Dependencies

- Foundation PR contracts: `ClipperPerformanceScore`, `CampaignBenchmark` Prisma models, `submission.viral` / `submission.underperform` event types.
- A's `MetricSnapshot` and `submission.metrics.updated` events. Until A ships, B can develop against mock events generated from a test script.
