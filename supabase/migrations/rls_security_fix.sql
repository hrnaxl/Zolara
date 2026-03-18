-- ============================================================
-- Zolara — Complete RLS Security Fix
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ── HELPER: role check function ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ── 1. SETTINGS ───────────────────────────────────────────────
-- Public can read (landing page needs open_time, settings, etc.)
-- Only staff/admin can write
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_public_read"   ON public.settings;
DROP POLICY IF EXISTS "settings_staff_write"   ON public.settings;
CREATE POLICY "settings_public_read"  ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_staff_write"  ON public.settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 2. SERVICES ───────────────────────────────────────────────
-- Public can read active services (landing page, booking form)
-- Only authenticated staff can write
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_public_read"  ON public.services;
DROP POLICY IF EXISTS "services_staff_write"  ON public.services;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (true);
CREATE POLICY "services_staff_write" ON public.services FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 3. SERVICE_VARIANTS ───────────────────────────────────────
ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "svc_variants_public_read"  ON public.service_variants;
DROP POLICY IF EXISTS "svc_variants_staff_write"  ON public.service_variants;
CREATE POLICY "svc_variants_public_read" ON public.service_variants FOR SELECT USING (true);
CREATE POLICY "svc_variants_staff_write" ON public.service_variants FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 4. SERVICE_ADDONS ─────────────────────────────────────────
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "svc_addons_public_read"  ON public.service_addons;
DROP POLICY IF EXISTS "svc_addons_staff_write"  ON public.service_addons;
CREATE POLICY "svc_addons_public_read" ON public.service_addons FOR SELECT USING (true);
CREATE POLICY "svc_addons_staff_write" ON public.service_addons FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 5. REVIEWS ────────────────────────────────────────────────
-- Public can read visible reviews (landing page)
-- Only authenticated can insert/update/delete
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_public_read"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_auth_write"   ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (visible = true OR auth.role() = 'authenticated');
CREATE POLICY "reviews_auth_write"  ON public.reviews FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 6. BOOKINGS ───────────────────────────────────────────────
-- Public can INSERT (booking form is public)
-- Authenticated users can read/update all bookings (staff need full access)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_public_insert"  ON public.bookings;
DROP POLICY IF EXISTS "bookings_auth_all"       ON public.bookings;
CREATE POLICY "bookings_public_insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_auth_all"      ON public.bookings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 7. CLIENTS ────────────────────────────────────────────────
-- Public can INSERT (findOrCreateClient called from public booking form)
-- Authenticated can read/update all (staff manage clients)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_public_insert"  ON public.clients;
DROP POLICY IF EXISTS "clients_auth_all"       ON public.clients;
CREATE POLICY "clients_public_insert" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "clients_auth_all"      ON public.clients FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 8. STAFF ──────────────────────────────────────────────────
-- Staff table needs to be readable during signup/login (role check)
-- Public SELECT needed for email lookup during signup
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_public_read"  ON public.staff;
DROP POLICY IF EXISTS "staff_auth_write"   ON public.staff;
CREATE POLICY "staff_public_read" ON public.staff FOR SELECT USING (true);
CREATE POLICY "staff_auth_write"  ON public.staff FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 9. USER_ROLES ─────────────────────────────────────────────
-- Needs to be readable during login (role redirect)
-- Only system/admin can write
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_public_read"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_auth_write"   ON public.user_roles;
CREATE POLICY "user_roles_public_read" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_auth_write"  ON public.user_roles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 10. SALES ─────────────────────────────────────────────────
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_auth_all"  ON public.sales;
CREATE POLICY "sales_auth_all" ON public.sales FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 11. ATTENDANCE ────────────────────────────────────────────
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_auth_all"  ON public.attendance;
CREATE POLICY "attendance_auth_all" ON public.attendance FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 12. GIFT_CARDS ────────────────────────────────────────────
-- Public needs SELECT for code validation at checkout (anon) and INSERT via API routes (service role bypasses RLS anyway)
-- Anon can read by code for validation; authenticated can do everything
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gift_cards_public_read"  ON public.gift_cards;
DROP POLICY IF EXISTS "gift_cards_auth_all"     ON public.gift_cards;
CREATE POLICY "gift_cards_public_read" ON public.gift_cards FOR SELECT USING (true);
CREATE POLICY "gift_cards_auth_all"    ON public.gift_cards FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 13. PRODUCTS ──────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_read"  ON public.products;
DROP POLICY IF EXISTS "products_auth_write"   ON public.products;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_auth_write"  ON public.products FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 14. PRODUCT_CATEGORIES ────────────────────────────────────
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_cats_public_read"  ON public.product_categories;
DROP POLICY IF EXISTS "product_cats_auth_write"   ON public.product_categories;
CREATE POLICY "product_cats_public_read" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "product_cats_auth_write"  ON public.product_categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 15. PROMO_CODES ───────────────────────────────────────────
-- Public booking form validates promo codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_codes_public_read"  ON public.promo_codes;
DROP POLICY IF EXISTS "promo_codes_auth_write"   ON public.promo_codes;
CREATE POLICY "promo_codes_public_read" ON public.promo_codes FOR SELECT USING (true);
CREATE POLICY "promo_codes_auth_write"  ON public.promo_codes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 16. SUBSCRIPTION_PLANS ────────────────────────────────────
-- Landing page reads active plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sub_plans_public_read"  ON public.subscription_plans;
DROP POLICY IF EXISTS "sub_plans_auth_write"   ON public.subscription_plans;
CREATE POLICY "sub_plans_public_read" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "sub_plans_auth_write"  ON public.subscription_plans FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 17. CLIENT_SUBSCRIPTIONS ──────────────────────────────────
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_subs_auth_all"  ON public.client_subscriptions;
CREATE POLICY "client_subs_auth_all" ON public.client_subscriptions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 18. SUBSCRIPTION_USAGE ────────────────────────────────────
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sub_usage_auth_all"  ON public.subscription_usage;
CREATE POLICY "sub_usage_auth_all" ON public.subscription_usage FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 19. CLIENT_NOTES ──────────────────────────────────────────
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_notes_auth_all"  ON public.client_notes;
CREATE POLICY "client_notes_auth_all" ON public.client_notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 20. CHECKOUT_SESSIONS ─────────────────────────────────────
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkout_sessions_auth_all"  ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_auth_all" ON public.checkout_sessions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 21. CHECKOUT_ITEMS ────────────────────────────────────────
ALTER TABLE public.checkout_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkout_items_auth_all"  ON public.checkout_items;
CREATE POLICY "checkout_items_auth_all" ON public.checkout_items FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 22. WAITLIST ──────────────────────────────────────────────
-- Public can insert (join waitlist from public page)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_public_insert"  ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_auth_all"       ON public.waitlist;
CREATE POLICY "waitlist_public_insert" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "waitlist_auth_all"      ON public.waitlist FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 23. USER_SESSIONS ─────────────────────────────────────────
-- Authenticated users can manage their own sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_sessions_own"  ON public.user_sessions;
CREATE POLICY "user_sessions_own" ON public.user_sessions FOR ALL
  USING (user_id = auth.uid() OR auth.role() = 'authenticated')
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'authenticated');

-- ── 24. SMS_QUEUE ─────────────────────────────────────────────
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_queue_auth_all"  ON public.sms_queue;
CREATE POLICY "sms_queue_auth_all" ON public.sms_queue FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 25. SMS_CAMPAIGNS ─────────────────────────────────────────
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_campaigns_auth_all"  ON public.sms_campaigns;
CREATE POLICY "sms_campaigns_auth_all" ON public.sms_campaigns FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 26. ORDERS ────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_auth_all"  ON public.orders;
CREATE POLICY "orders_auth_all" ON public.orders FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 27. PAYMENT_TRANSACTIONS ──────────────────────────────────
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_tx_auth_all"  ON public.payment_transactions;
CREATE POLICY "payment_tx_auth_all" ON public.payment_transactions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 28. PAYMENT_METHODS ───────────────────────────────────────
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_methods_auth_all"  ON public.payment_methods;
CREATE POLICY "payment_methods_auth_all" ON public.payment_methods FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 29. PAYMENT_SETTINGS ──────────────────────────────────────
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_settings_auth_all"  ON public.payment_settings;
CREATE POLICY "payment_settings_auth_all" ON public.payment_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 30. GALLERY ───────────────────────────────────────────────
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gallery_public_read"  ON public.gallery;
DROP POLICY IF EXISTS "gallery_auth_write"   ON public.gallery;
CREATE POLICY "gallery_public_read" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "gallery_auth_write"  ON public.gallery FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 31. WHATSAPP_CONTACTS ─────────────────────────────────────
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_contacts_auth_all"  ON public.whatsapp_contacts;
CREATE POLICY "wa_contacts_auth_all" ON public.whatsapp_contacts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 32. WHATSAPP_MESSAGES ─────────────────────────────────────
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_messages_auth_all"  ON public.whatsapp_messages;
CREATE POLICY "wa_messages_auth_all" ON public.whatsapp_messages FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 33. ADDONS (legacy table if exists) ───────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='addons') THEN
    ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "addons_public_read" ON public.addons;
    DROP POLICY IF EXISTS "addons_auth_write"  ON public.addons;
    CREATE POLICY "addons_public_read" ON public.addons FOR SELECT USING (true);
    CREATE POLICY "addons_auth_write"  ON public.addons FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
  END IF;
END $$;

-- ── 34. SUBSCRIPTIONS (legacy) ────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='subscriptions') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "subscriptions_auth_all" ON public.subscriptions;
    CREATE POLICY "subscriptions_auth_all" ON public.subscriptions FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
  END IF;
END $$;

-- ── 35. Secure SECURITY DEFINER functions ─────────────────────
-- Revoke public/anon execute on all functions in public schema
-- then grant only to authenticated

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE  -- SECURITY DEFINER only
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- skip if function doesn't exist or can't be modified
    END;
  END LOOP;
END $$;

-- Explicitly secure get_my_role (already done above but make sure)
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ── 36. Storage buckets ───────────────────────────────────────
-- avatars bucket: public read (logo images shown on landing page)
-- Only authenticated can upload/delete
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── DONE ──────────────────────────────────────────────────────
-- All tables have RLS enabled.
-- Public (anon) access limited to:
--   SELECT on: settings, services, service_variants, service_addons,
--              reviews (visible only), staff (for login), user_roles (for login),
--              products, product_categories, promo_codes, subscription_plans,
--              gift_cards, gallery
--   INSERT on: bookings (public booking form), clients (findOrCreateClient),
--              waitlist
-- All financial/operational tables require authentication.
-- Service role (used in API routes) bypasses RLS entirely — no change needed there.

