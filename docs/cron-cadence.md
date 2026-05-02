# Cron cadence — current (Hobby) vs intended (Pro)

ClipProfit's automation needs higher-cadence polling than Vercel's Hobby plan allows (Hobby caps crons at once-per-day). To ship on Hobby without losing real-time behavior, the high-cadence crons run via **Supabase `pg_cron` + `pg_net`** instead of Vercel.

The handler code is identical either way — the route handlers (`/api/cron/*`) don't care who triggers them. Only the schedule lives in two places.

## Current state (Hobby)

`vercel.json` registers daily fallback schedules so Vercel doesn't reject the deploy. Supabase `pg_cron` triggers the high-cadence ones at the intended rates, calling the same Vercel routes via HTTPS.

| Route | Vercel schedule (Hobby) | Effective cadence | Source |
|---|---|---|---|
| `poll-metrics-hot` | `5 0 * * *` (daily, fallback only) | every 15 min | Supabase pg_cron |
| `poll-metrics-warm` | `10 0 * * *` (daily, fallback only) | hourly | Supabase pg_cron |
| `poll-demographics` | `0 2 * * *` | daily | Vercel |
| `refresh-tokens` | `0 9 * * 1` | weekly | Vercel |
| `autopost-scheduler` | `0 0 * * *` | daily | Vercel |
| `autopost-auto-approve` | `0 6 * * *` | daily | Vercel |
| `recompute-benchmarks` | `15 0 * * *` (daily, fallback only) | every 6 h | Supabase pg_cron |
| `recompute-scores` | `0 3 * * *` | daily | Vercel |
| `notification-dispatch` | `20 0 * * *` (daily, fallback only) | every 15 min | Supabase pg_cron |

## When you upgrade to Vercel Pro

Two-step flip:

1. Restore the intended schedules in `vercel.json`:

   | Route | Pro schedule |
   |---|---|
   | `poll-metrics-hot` | `*/15 * * * *` |
   | `poll-metrics-warm` | `0 * * * *` |
   | `recompute-benchmarks` | `0 */6 * * *` |
   | `notification-dispatch` | `*/15 * * * *` |

2. Disable the matching Supabase pg_cron jobs (they'd otherwise duplicate). SQL:

   ```sql
   select cron.unschedule('clipprofit-poll-metrics-hot');
   select cron.unschedule('clipprofit-poll-metrics-warm');
   select cron.unschedule('clipprofit-recompute-benchmarks');
   select cron.unschedule('clipprofit-notification-dispatch');
   ```

3. Redeploy. Done — total time ~5 minutes.

## How the Supabase side calls Vercel

`pg_cron` schedules a `SELECT net.http_post(...)` that hits the Vercel route with `Authorization: Bearer ${CRON_SECRET}`. The route's `verifyCron` (`src/lib/cron-auth.ts`) accepts the Bearer fallback when no `x-vercel-cron` header is present, so Supabase-triggered calls authenticate identically to Vercel-triggered calls.

The migration that creates the pg_cron + pg_net jobs lives at `supabase/migrations/20260502_pgcron_high_cadence.sql`.
