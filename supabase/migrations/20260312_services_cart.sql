-- Add services_cart column to store multiple services per booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS services_cart jsonb DEFAULT '[]'::jsonb;
