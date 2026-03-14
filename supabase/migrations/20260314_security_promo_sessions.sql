-- ================================================================
-- SECURITY + PROMO + SESSION MIGRATION
-- ================================================================

-- 1. Account status on user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active' 
  CHECK (account_status IN ('active', 'inactive'));

-- 2. Session tracking table (for single-session enforcement)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,              -- random token set on each login
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read own session" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service role manages sessions" ON public.user_sessions USING (TRUE) WITH CHECK (TRUE);

-- 3. Promo columns on sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS original_price   NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS promo_code_used  TEXT;

-- 4. Ensure only one owner row in user_roles
CREATE UNIQUE INDEX IF NOT EXISTS only_one_owner ON public.user_roles (role) WHERE role = 'owner';

-- 5. RLS: owner can update account_status on any non-owner user_role row
CREATE POLICY IF NOT EXISTS "owner can manage account status" ON public.user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r 
      WHERE r.user_id = auth.uid() AND r.role = 'owner'
    )
  );

-- 6. Block inactive users: helper function used by ProtectedRoute check
CREATE OR REPLACE FUNCTION public.is_account_active(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT account_status = 'active' FROM public.user_roles WHERE user_id = p_user_id LIMIT 1),
    false
  );
$$;
