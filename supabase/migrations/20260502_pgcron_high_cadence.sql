-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron + pg_net high-cadence jobs for ClipProfit
--
-- Why: Vercel Hobby plan caps `vercel.json` crons at once-per-day. The hot/warm
-- metric polling, benchmark recompute, and notification dispatch all need
-- higher cadence. Supabase pg_cron + pg_net trigger the same Vercel route
-- handlers via HTTPS at the proper rate, bypassing Vercel's Hobby cron limit.
--
-- Auth: each call sends `Authorization: Bearer <CRON_SECRET>`. The Vercel
-- route handler `verifyCron()` (src/lib/cron-auth.ts) accepts that as a
-- fallback when no `x-vercel-cron` header is present.
--
-- Reversal (when upgrading to Vercel Pro):
--   SELECT cron.unschedule('clipprofit-poll-metrics-hot');
--   SELECT cron.unschedule('clipprofit-poll-metrics-warm');
--   SELECT cron.unschedule('clipprofit-recompute-benchmarks');
--   SELECT cron.unschedule('clipprofit-notification-dispatch');
-- Then restore the schedules in vercel.json (see docs/cron-cadence.md).
--
-- Setup notes:
--   * Replace <CRON_SECRET> below with the real value before running, OR
--     create the vault secret first (already done in the live db on 2026-05-02).
--   * Already-applied to project qdcgmsaaxjylnhrrbvvx on 2026-05-02.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- One-time vault setup (idempotent: skips if the name is taken).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'clipprofit_cron_secret') THEN
    PERFORM vault.create_secret(
      '<CRON_SECRET>',
      'clipprofit_cron_secret',
      'Bearer token for ClipProfit Vercel cron endpoints'
    );
  END IF;
END
$$;

-- ── Hot metric polling: every 15 min ──
SELECT cron.schedule(
  'clipprofit-poll-metrics-hot',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://app.clipprofit.com/api/cron/poll-metrics-hot',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ── Warm metric polling: hourly ──
SELECT cron.schedule(
  'clipprofit-poll-metrics-warm',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://app.clipprofit.com/api/cron/poll-metrics-warm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ── Campaign benchmark recompute: every 6 hours ──
SELECT cron.schedule(
  'clipprofit-recompute-benchmarks',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://app.clipprofit.com/api/cron/recompute-benchmarks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ── Notification dispatch retry drain: every 15 min ──
SELECT cron.schedule(
  'clipprofit-notification-dispatch',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://app.clipprofit.com/api/cron/notification-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ── Verify ──
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE 'clipprofit-%';
