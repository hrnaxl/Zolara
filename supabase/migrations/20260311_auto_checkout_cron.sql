-- Enable pg_cron extension (may already be enabled)
create extension if not exists pg_cron;

-- Enable pg_net for HTTP calls from cron (required to invoke Edge Functions)
create extension if not exists pg_net;

-- Schedule auto-checkout at 23:58 GMT every day
-- Cron syntax: minute hour day month weekday
select cron.schedule(
  'auto-checkout-staff',           -- job name (unique)
  '58 23 * * *',                   -- 23:58 GMT daily
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/auto-checkout',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);
