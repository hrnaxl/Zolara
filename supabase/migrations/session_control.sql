-- ============================================================
-- Zolara Session Control — run once in Supabase SQL editor
-- ============================================================

-- 1. user_sessions table (single-session enforcement)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token  TEXT         NOT NULL UNIQUE,
  device_info    TEXT,
  last_active    TIMESTAMPTZ  DEFAULT NOW(),
  is_active      BOOLEAN      DEFAULT TRUE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token  ON public.user_sessions(session_token);

-- RLS: only service role can read/write (client uses anon key via API routes)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON public.user_sessions;
CREATE POLICY "service_role_full" ON public.user_sessions
  FOR ALL USING (true);

-- 2. Add status column to attendance if not present (for auto-checkout tracking)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing closed sessions
UPDATE public.attendance
  SET status = 'closed'
  WHERE check_out IS NOT NULL AND status IS NULL;

-- 3. Auto-cleanup: remove user_sessions older than 30 days
-- (optional, keeps the table lean)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_active = FALSE;
END;
$$;

-- ============================================================
-- Cron: auto-checkout staff at 23:59 daily
-- Requires pg_cron extension (enabled by default on Supabase)
-- Replace <project-ref> and <service-role-key> with real values
-- ============================================================
-- SELECT cron.schedule(
--   'auto-checkout-staff-daily',
--   '59 23 * * *',
--   $$
--     SELECT net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/auto-checkout-staff',
--       headers := '{"Authorization": "Bearer <service-role-key>", "Content-Type": "application/json"}'::jsonb,
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );
