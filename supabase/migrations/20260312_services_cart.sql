-- Run this in Supabase SQL Editor
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS services_cart jsonb DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS loyalty_discount numeric DEFAULT 0;
