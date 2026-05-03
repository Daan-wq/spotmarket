# Charter A — Tracking Foundation

> Read `docs/agent-team/README.md` first. This charter assumes the foundation PR has merged.

## Goal

Trustworthy, fresh, automated metric data for every active submission, sourced **only from official platform APIs (OAuth)**. Everything downstream consumes A's outputs.

## Hard rules — locked, do not negotiate

- **No Apify.** Delete `src/lib/apify.ts`, `apify-client` from `package.json`, all `APIFY_*` env vars, every import. CI grep must return zero hits.
- **No scraping of any kind.** No headless browsers, no fetch-and-parse-HTML, no third-party scraping APIs.
- **OAuth required to submit.** Reject submissions where the creator lacks a verified OAuth connection on `sourcePlatform`. Error response points to `/creator/connections`.
- **BIO_VERIFY flow deprecated.** Delete the bio-verify path, the bio cron, the `/creator/verify` bio surfaces. Keep the `BioVerification` Prisma model — drop in next cleanup.
- **Logo verification is manual.** Surface in admin UI (D builds the widget). A only sets `logoStatus = PENDING` at submission create.

## In scope

1. **Cron alignment** — implement real crons; delete the 5 ghost entries in `vercel.json` (`poll-views`, `auto-approve`, `weekly-payouts`, `sync-account-insights`, `sync-media-insights`).
2. **Polling cadence tiers** — hot (<24h) every 15 min; warm (1–7 days) hourly; cold (>7 days) daily; frozen (>30 days) off. Tier moves are automatic.
3. **OAuth-only metric router** — `src/lib/metrics/router.ts`. Routes by `sourcePlatform`. No fallback. Token-broken → `MetricSnapshot.source = OAUTH_FAILED` + `submission.flagged` event with `TOKEN_BROKEN`.
4. **YouTube fill** — `src/lib/clip-views.ts:58` returns real values via YouTube Data v3.
5. **TikTok / IG / FB metric sync** — activate existing OAuth scaffolds.
6. **Audience demographics auto-pull** — `src/lib/audience-fetcher/*` per platform. Delete manual screenshot flow (creator + admin).
7. **Anti-bot / velocity scoring** — `src/lib/velocity-scorer.ts`. Delta-views per minute; flag spikes > 10× rolling 7d mean; ratio outliers; engagement collapse. Emit `submission.flagged` events.
8. **OAuth-required submission gate** — `src/app/api/submissions/route.ts` rejects without verified OAuth on platform. Initialize `logoStatus = PENDING` on create.
9. **Duplicate detection** — finish `src/app/api/submissions/check-duplicate/route.ts` stub. Match on URL + author handle. No phash.
10. **Apify wipe** — explicit task. `grep -r -i apify` returns zero hits.
11. **Bio-verify wipe** — delete `/api/cron/check-bio`, all bio-verify UI on creator side, no app-code reads/writes of `BioVerification`.

## Out of scope

- Performance score formula (B)
- Viral / underperform detection (B)
- Admin UI / logo-review widget (D)
- Clipper UI (C)
- Notification delivery (E — A only emits events)
- Automated logo / brand-message detection (out forever)

## Architecture

```
                              ┌────────────────────────────┐
                              │  Cron Scheduler (Vercel)   │
                              └────────────┬───────────────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            ▼                              ▼                              ▼
   poll-metrics-hot           poll-metrics-warm              poll-demographics
   (every 15m)                (hourly)                       (daily)
            │                              │                              │
            └──────────────┬───────────────┘                              │
                           ▼                                              │
              ┌─────────────────────────┐                                 │
              │  metric-fetcher router  │  (OAuth only — no fallback)    │
              └────────┬────────────────┘                                 │
                       │                                                  │
       ┌───────────────┼──────────────────┬──────────────────┐            │
       ▼               ▼                  ▼                  ▼            │
   IG Graph       TT Display API     YT Data API        FB Graph          │
       │               │                  │                  │            │
       └───────┬───────┴──────────────────┴──────────────────┘            │
               ▼                                                          │
      ┌──────────────────┐                                                │
      │ velocity scorer  │ ◄──────── rolling stats (Redis)                │
      │ + anomaly flag   │                                                │
      └────────┬─────────┘                                                │
               │                                                          │
               ▼                                                          ▼
      ┌──────────────────────────────────────────────────────────────────┐
      │  CampaignSubmission + MetricSnapshot + AudienceSnapshot (Prisma) │
      └──────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │  Event Bus      │  → Redis pub/sub
                   │                 │     consumers: B, C, D, E
                   └─────────────────┘
```

## Critical files

| File | Change |
|---|---|
| `src/lib/metrics/router.ts` (new) | OAuth-only metric router |
| `src/lib/metrics/instagram.ts` (new) | IG Graph metric fetch |
| `src/lib/metrics/tiktok.ts` (new) | TikTok Display API metric fetch |
| `src/lib/metrics/youtube.ts` (new) | YouTube Data v3 metric fetch |
| `src/lib/metrics/facebook.ts` (new) | FB Graph metric fetch |
| `src/lib/velocity-scorer.ts` (new) | Compute velocity + flag anomalies |
| `src/lib/duplicate-detector.ts` (new) | URL + author handle dedupe |
| `src/lib/audience-fetcher/*` (new) | Per-platform demographics pull |
| `src/app/api/cron/poll-metrics-hot/route.ts` (new) | Replaces ghost cron |
| `src/app/api/cron/poll-metrics-warm/route.ts` (new) | Replaces ghost cron |
| `src/app/api/cron/poll-demographics/route.ts` (new) | Replaces `refresh-demographics` |
| `src/app/api/submissions/route.ts` (existing) | OAuth gate, init `logoStatus = PENDING`, dedupe check |
| `src/app/api/submissions/check-duplicate/route.ts` (existing stub) | Implement |
| `vercel.json` | Replace ghost crons with real ones |
| **DELETE** `src/lib/apify.ts` | Wipe |
| **DELETE** `src/app/api/cron/scrape-views/route.ts` | Replaced by `poll-metrics-hot/warm` |
| **DELETE** `src/app/api/cron/check-bio/route.ts` | Bio-verify deprecated |
| **DELETE** `/creator/verify` bio paths (keep OAuth-verify only) | Bio-verify deprecated |
| **DELETE** TikTok demographics screenshot UI: creator submission page + `/admin/tiktok-demographics` + `/admin/review/demographics` | Replaced by API auto-pull |
| `package.json` | Remove `apify-client` dep (if present) |
| `.env.example` | Remove `APIFY_*` vars |

## Verification

1. **Apify-zero check** — `grep -r -i apify src/ prisma/ vercel.json package.json .env.example` → zero hits.
2. **Unit** — velocity scorer with synthetic time-series; duplicate detector with URL + handle collisions.
3. **Integration** — seed 5 submissions across IG/TT/YT/FB on real OAuth'd accounts, run `poll-metrics-hot` locally, confirm `MetricSnapshot` rows with `source = OAUTH_*` and `submission.metrics.updated` events on the bus.
4. **OAuth gate** — attempt submission without OAuth on the platform; expect 4xx pointing to `/creator/connections`.
5. **Token-broken path** — expire a token, run cron, confirm `MetricSnapshot.source = OAUTH_FAILED` and `submission.flagged` event with `TOKEN_BROKEN`.
6. **Demographics** — connect real IG, run `poll-demographics`, confirm `AudienceSnapshot` matches IG Insights UI.
7. **Bio-verify-zero** — `/creator/verify` only renders OAuth flows; `/api/cron/check-bio` returns 404.
