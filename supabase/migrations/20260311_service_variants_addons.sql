-- ================================================================
-- ZOLARA SERVICE VARIANTS & ADD-ONS MIGRATION
-- Enables per-service length/size variants and optional add-ons
-- Run once in Supabase SQL Editor
-- ================================================================

-- 1. Service Variants (e.g. Short / Medium / Waist Length / Long)
create table if not exists service_variants (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  name text not null,
  price_adjustment numeric not null default 0,
  duration_adjustment integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_variants_service_id on service_variants(service_id);
alter table service_variants enable row level security;
drop policy if exists "service_variants_select" on service_variants;
drop policy if exists "service_variants_all" on service_variants;
create policy "service_variants_select" on service_variants for select using (true);
create policy "service_variants_insert" on service_variants for insert with check (true);
create policy "service_variants_update" on service_variants for update using (true);
create policy "service_variants_delete" on service_variants for delete using (true);

-- 2. Service Add-ons (e.g. Extra Curls +GHS 65)
create table if not exists service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null default 0,
  duration_adjustment integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_addons_service_id on service_addons(service_id);
alter table service_addons enable row level security;
drop policy if exists "service_addons_select" on service_addons;
drop policy if exists "service_addons_all" on service_addons;
create policy "service_addons_select" on service_addons for select using (true);
create policy "service_addons_insert" on service_addons for insert with check (true);
create policy "service_addons_update" on service_addons for update using (true);
create policy "service_addons_delete" on service_addons for delete using (true);

-- 3. Extend bookings table with variant + addon tracking
alter table bookings
  add column if not exists variant_id uuid,
  add column if not exists variant_name text,
  add column if not exists selected_addons jsonb default '[]'::jsonb;
