-- Hourly refresh for short-lived social access tokens.
-- Vercel Hobby only allows daily cron schedules in vercel.json, so pg_cron
-- calls the same route at the intended hourly cadence.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clipprofit-refresh-tokens') THEN
    PERFORM cron.unschedule('clipprofit-refresh-tokens');
  END IF;
END
$$;

SELECT cron.schedule(
  'clipprofit-refresh-tokens',
  '0 * * * *',
  $$
    SELECT net.http_get(
      url := 'https://app.clipprofit.com/api/cron/refresh-tokens',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'clipprofit_cron_secret'
        )
      )
    );
  $$
);
