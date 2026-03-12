-- Fix auto-checkout cron: replace current_setting() with hardcoded URL (matches ecommerce pattern)
select cron.unschedule('auto-checkout-staff') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-checkout-staff'
);

select cron.schedule(
  'auto-checkout-staff',
  '58 23 * * *',
  $$
  select net.http_post(
    url    := 'https://vwvrhbyfytmqsywfdhvd.supabase.co/functions/v1/auto-checkout',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54'
    ),
    body := '{}'::jsonb
  );
  $$
);
