-- ================================================================
-- ZOLARA E-COMMERCE MIGRATION
-- Gift card e-commerce + booking deposit flow
-- ================================================================

-- 1. Extend gift_cards table
alter table gift_cards
  add column if not exists tier text,                        -- Silver/Gold/Platinum/Diamond
  add column if not exists card_type text default 'digital', -- physical | digital
  add column if not exists serial_number text,               -- ZLR-GLD-0047 (physical only)
  add column if not exists buyer_name text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_email text,
  add column if not exists delivery_type text,               -- email | physical
  add column if not exists payment_ref text,                 -- Hubtel payment reference
  add column if not exists payment_status text default 'pending', -- pending | paid
  add column if not exists batch_id text,                    -- groups physical print batches
  add column if not exists is_admin_generated boolean default false,
  add column if not exists redeemed_by_client text,
  add column if not exists redeemed_at timestamptz,
  add column if not exists note text;

-- 2. Add serial_number unique index
create unique index if not exists gift_cards_serial_number_idx
  on gift_cards(serial_number) where serial_number is not null;

-- 3. Add payment_ref to bookings (for Hubtel reference)
alter table bookings
  add column if not exists payment_ref text,
  add column if not exists payment_status text default 'pending'; -- pending | paid | waived

-- 4. Online gift card purchases log (tracks Hubtel webhooks)
create table if not exists online_purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_type text not null,           -- gift_card | deposit
  amount numeric not null,
  payment_ref text,                      -- Hubtel ref
  payment_status text default 'pending', -- pending | paid | failed
  metadata jsonb,                        -- flexible: booking_id, gift_card_id, etc.
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  created_at timestamptz default now(),
  paid_at timestamptz
);


-- Cron: send pending gift card emails every 5 minutes
select cron.schedule(
  'send-gift-card-emails',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://wbcuyabgzfqjarrpuocr.supabase.co/functions/v1/send-gift-card-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54'
    ),
    body := '{}'::jsonb
  );
  $$
);
