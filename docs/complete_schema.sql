-- ============================================
-- ZOLARA BEAUTY STUDIO - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- SETTINGS
-- ============================================
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  business_name text default 'Zolara Beauty Studio',
  business_phone text default '0594 365 314',
  business_email text default 'info@zolarasalon.com',
  business_address text default 'Sakasaka, Opposite CalBank, Tamale',
  logo_url text,
  open_time text default '08:30',
  close_time text default '21:00',
  currency text default 'GHS',
  gallery_images text[] default '{}',
  payment_methods text[] default '{"cash","mobile_money"}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default settings
insert into public.settings (business_name, business_phone, business_address, open_time, close_time)
values ('Zolara Beauty Studio', '0594 365 314', 'Sakasaka, Opposite CalBank, Tamale', '08:30', '21:00')
on conflict do nothing;

-- ============================================
-- USER ROLES
-- ============================================
create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'receptionist', 'staff', 'client')),
  created_at timestamptz default now(),
  unique(user_id)
);

-- ============================================
-- STAFF
-- ============================================
create table if not exists public.staff (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  role text default 'staff' check (role in ('owner', 'admin', 'receptionist', 'staff')),
  specialties text[] default '{}',
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SERVICES
-- ============================================
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text,
  price numeric(10,2),
  duration_minutes integer default 60,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default services
insert into public.services (name, category, price, duration_minutes) values
  ('Cornrows', 'Hair & Braiding', 80, 120),
  ('Knotless Braids', 'Hair & Braiding', 150, 240),
  ('Box Braids', 'Hair & Braiding', 200, 300),
  ('Gel Polish', 'Nail Artistry', 60, 60),
  ('Acrylic Set', 'Nail Artistry', 120, 90),
  ('Classic Lashes', 'Lash Extensions', 65, 90),
  ('Volume Lashes', 'Lash Extensions', 120, 120),
  ('Natural Glow Makeup', 'Makeup', 125, 90),
  ('Full Glam Makeup', 'Makeup', 200, 120),
  ('Classic Pedicure', 'Pedicure & Manicure', 100, 60),
  ('Signature Pedicure', 'Pedicure & Manicure', 180, 90),
  ('Wig Install', 'Wigs & Styling', 150, 90)
on conflict do nothing;

-- ============================================
-- CLIENTS
-- ============================================
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  notes text,
  loyalty_points integer default 0,
  total_visits integer default 0,
  total_spent numeric(10,2) default 0,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- BOOKINGS
-- ============================================
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_name text,
  client_phone text,
  client_email text,
  service_name text,
  staff_name text,
  preferred_date date not null,
  preferred_time time not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes text,
  price numeric(10,2),
  duration_minutes integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Block Sunday bookings
create or replace function public.check_no_sunday_bookings()
returns trigger language plpgsql as $$
begin
  if extract(dow from new.preferred_date) = 0 then
    raise exception 'Bookings are not allowed on Sundays';
  end if;
  return new;
end;
$$;

drop trigger if exists no_sunday_bookings on public.bookings;
create trigger no_sunday_bookings
  before insert or update on public.bookings
  for each row execute function public.check_no_sunday_bookings();

-- ============================================
-- SALES
-- ============================================
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  client_name text,
  service_name text,
  amount numeric(10,2) not null,
  payment_method text default 'cash' check (payment_method in ('cash', 'mobile_money', 'bank_transfer', 'gift_card')),
  status text default 'completed' check (status in ('pending', 'completed', 'refunded')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- ATTENDANCE
-- ============================================
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references public.staff(id) on delete cascade not null,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text default 'present' check (status in ('present', 'absent', 'late', 'half_day', 'leave')),
  notes text,
  created_at timestamptz default now(),
  unique(staff_id, date)
);

-- ============================================
-- GIFT CARDS
-- ============================================
create table if not exists public.gift_cards (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  amount numeric(10,2) not null,
  balance numeric(10,2) not null,
  purchaser_email text,
  recipient_email text,
  recipient_name text,
  message text,
  status text default 'active' check (status in ('active', 'used', 'expired', 'cancelled')),
  expires_at timestamptz default (now() + interval '12 months'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- REVIEWS
-- ============================================
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  visible boolean default false,
  created_at timestamptz default now()
);

-- Insert sample reviews
insert into public.reviews (name, rating, comment, visible) values
  ('Valentine', 5, 'Zolara is an amazing beauty studio', true),
  ('Amanda', 5, 'Superb service all round', true)
on conflict do nothing;

-- ============================================
-- CLIENT NOTES
-- ============================================
create table if not exists public.client_notes (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade not null,
  staff_id uuid references public.staff(id) on delete set null,
  note text not null,
  created_at timestamptz default now()
);

-- ============================================
-- WAITLIST
-- ============================================
create table if not exists public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  client_phone text not null,
  client_email text,
  service_id uuid references public.services(id) on delete set null,
  preferred_date date,
  status text default 'waiting' check (status in ('waiting', 'contacted', 'booked', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- PROMO CODES
-- ============================================
create table if not exists public.promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null,
  min_purchase numeric(10,2) default 0,
  max_uses integer,
  uses_count integer default 0,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- SMS CAMPAIGNS
-- ============================================
create table if not exists public.sms_campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  message text not null,
  recipient_type text default 'all' check (recipient_type in ('all', 'clients', 'staff', 'custom')),
  recipients text[],
  status text default 'draft' check (status in ('draft', 'sent', 'failed')),
  sent_count integer default 0,
  created_at timestamptz default now(),
  sent_at timestamptz
);

-- ============================================
-- PRODUCTS / INVENTORY
-- ============================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text,
  price numeric(10,2),
  cost_price numeric(10,2),
  stock_quantity integer default 0,
  low_stock_threshold integer default 5,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ADDONS
-- ============================================
create table if not exists public.addons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric(10,2) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- RLS POLICIES
-- ============================================
alter table public.settings enable row level security;
alter table public.user_roles enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.sales enable row level security;
alter table public.attendance enable row level security;
alter table public.gift_cards enable row level security;
alter table public.reviews enable row level security;
alter table public.client_notes enable row level security;
alter table public.waitlist enable row level security;
alter table public.promo_codes enable row level security;
alter table public.sms_campaigns enable row level security;
alter table public.products enable row level security;
alter table public.addons enable row level security;

-- Allow public read of settings and services
create policy "Public can read settings" on public.settings for select using (true);
create policy "Public can read services" on public.services for select using (true);
create policy "Public can read visible reviews" on public.reviews for select using (visible = true);

-- Allow public to insert bookings and reviews
create policy "Public can create bookings" on public.bookings for insert with check (true);
create policy "Public can create reviews" on public.reviews for insert with check (true);

-- Authenticated users can do everything on all tables
create policy "Authenticated full access settings" on public.settings for all using (auth.role() = 'authenticated');
create policy "Authenticated full access user_roles" on public.user_roles for all using (auth.role() = 'authenticated');
create policy "Authenticated full access staff" on public.staff for all using (auth.role() = 'authenticated');
create policy "Authenticated full access clients" on public.clients for all using (auth.role() = 'authenticated');
create policy "Authenticated full access bookings" on public.bookings for all using (auth.role() = 'authenticated');
create policy "Authenticated full access sales" on public.sales for all using (auth.role() = 'authenticated');
create policy "Authenticated full access attendance" on public.attendance for all using (auth.role() = 'authenticated');
create policy "Authenticated full access gift_cards" on public.gift_cards for all using (auth.role() = 'authenticated');
create policy "Authenticated full access reviews" on public.reviews for all using (auth.role() = 'authenticated');
create policy "Authenticated full access client_notes" on public.client_notes for all using (auth.role() = 'authenticated');
create policy "Authenticated full access waitlist" on public.waitlist for all using (auth.role() = 'authenticated');
create policy "Authenticated full access promo_codes" on public.promo_codes for all using (auth.role() = 'authenticated');
create policy "Authenticated full access sms_campaigns" on public.sms_campaigns for all using (auth.role() = 'authenticated');
create policy "Authenticated full access products" on public.products for all using (auth.role() = 'authenticated');
create policy "Authenticated full access addons" on public.addons for all using (auth.role() = 'authenticated');

-- ============================================
-- EMAIL VERIFICATION RPC
-- ============================================
create or replace function public.is_email_verified(user_id uuid)
returns boolean language plpgsql security definer as $$
declare
  verified boolean;
begin
  select (email_confirmed_at is not null) into verified
  from auth.users where id = user_id;
  return coalesce(verified, false);
end;
$$;

-- ============================================
-- DONE
-- ============================================
select 'Database setup complete!' as status;
