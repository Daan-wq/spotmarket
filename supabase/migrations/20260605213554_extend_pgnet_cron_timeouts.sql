-- The default pg_net timeout in this project is 5 seconds. Metrics polling
-- legitimately takes longer, so pg_net was cancelling otherwise healthy
-- Vercel cron requests before they could finish. Keep the existing schedules
-- and authentication, but allow the routes to use their full execution window.

DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'clipprofit-poll-metrics-hot',
    'clipprofit-poll-metrics-warm',
    'clipprofit-recompute-benchmarks',
    'clipprofit-notification-dispatch',
    'clipprofit-refresh-tokens'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;
END
$$;

SELECT cron.schedule(
  'clipprofit-poll-metrics-hot',
  '*/15 * * * *',
  $job$
    SELECT net.http_get(
      url := 'https://app.clipprofit.com/api/cron/poll-metrics-hot',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      timeout_milliseconds := 300000
    );
  $job$
);

SELECT cron.schedule(
  'clipprofit-poll-metrics-warm',
  '0 * * * *',
  $job$
    SELECT net.http_get(
      url := 'https://app.clipprofit.com/api/cron/poll-metrics-warm',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      timeout_milliseconds := 300000
    );
  $job$
);

SELECT cron.schedule(
  'clipprofit-recompute-benchmarks',
  '0 */6 * * *',
  $job$
    SELECT net.http_get(
      url := 'https://app.clipprofit.com/api/cron/recompute-benchmarks',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      timeout_milliseconds := 300000
    );
  $job$
);

SELECT cron.schedule(
  'clipprofit-notification-dispatch',
  '*/15 * * * *',
  $job$
    SELECT net.http_get(
      url := 'https://app.clipprofit.com/api/cron/notification-dispatch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      timeout_milliseconds := 300000
    );
  $job$
);

SELECT cron.schedule(
  'clipprofit-refresh-tokens',
  '0 * * * *',
  $job$
    SELECT net.http_get(
      url := 'https://app.clipprofit.com/api/cron/refresh-tokens',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      ),
      timeout_milliseconds := 300000
    );
  $job$
);
