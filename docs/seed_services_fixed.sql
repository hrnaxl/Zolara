-- ================================================================
-- ZOLARA BEAUTY STUDIO  FULL SERVICE MENU SEED
-- Run in Supabase SQL Editor
-- ================================================================

--  BRAIDING SERVICES 

-- Fulani Braids
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Fulani Braids', 'Braiding', 0, 180, 'Traditional Fulani braiding style with variants by length', true)
ON CONFLICT DO NOTHING;

-- Fulani Braids variants
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 160, 1 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 220, 2 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 300, 3 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'XL / Waist Length', 380, 4 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;

-- Fulani Braids addons
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Curls', 65, 1 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Beads', 30, 2 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 80, 3 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Feed-in Base', 50, 4 FROM services WHERE name = 'Fulani Braids'
ON CONFLICT DO NOTHING;

-- Knotless Braids
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Knotless Braids', 'Braiding', 0, 240, 'Seamless knotless box braids - no knot at the root', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 200, 1 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 280, 2 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 380, 3 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'XL / Waist Length', 500, 4 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Curls', 65, 1 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 80, 2 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Triangle Parts', 40, 3 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Heart / Star Parts', 50, 4 FROM services WHERE name = 'Knotless Braids' ON CONFLICT DO NOTHING;

-- Box Braids
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Box Braids', 'Braiding', 0, 200, 'Classic box braids in your choice of size and length', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 180, 1 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 250, 2 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 340, 3 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'XL / Waist Length', 450, 4 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Curls', 65, 1 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 80, 2 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Triangle Parts', 40, 3 FROM services WHERE name = 'Box Braids' ON CONFLICT DO NOTHING;

-- Cornrows
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Cornrows', 'Braiding', 0, 90, 'Neat cornrow styles - straight back or creative patterns', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Simple Straight Back', 30, 1 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Ghana Lines (6--8)', 50, 2 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Ghana Lines (10--12)', 70, 3 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Curved / Pattern', 90, 4 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Extension Added', 40, 1 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Beads', 20, 2 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 60, 3 FROM services WHERE name = 'Cornrows' ON CONFLICT DO NOTHING;

-- Passion Twists
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Passion Twists', 'Braiding', 0, 210, 'Bohemian passion twists with natural curl texture', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 220, 1 FROM services WHERE name = 'Passion Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 300, 2 FROM services WHERE name = 'Passion Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 400, 3 FROM services WHERE name = 'Passion Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'XL / Waist Length', 500, 4 FROM services WHERE name = 'Passion Twists' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 80, 1 FROM services WHERE name = 'Passion Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Extra Volume', 60, 2 FROM services WHERE name = 'Passion Twists' ON CONFLICT DO NOTHING;

-- Senegalese Twists
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Senegalese Twists', 'Braiding', 0, 200, 'Smooth and sleek rope twists using Kanekalon or Marley hair', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 200, 1 FROM services WHERE name = 'Senegalese Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 280, 2 FROM services WHERE name = 'Senegalese Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 370, 3 FROM services WHERE name = 'Senegalese Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'XL / Waist Length', 460, 4 FROM services WHERE name = 'Senegalese Twists' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 80, 1 FROM services WHERE name = 'Senegalese Twists' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Curly Ends', 50, 2 FROM services WHERE name = 'Senegalese Twists' ON CONFLICT DO NOTHING;

-- Goddess Braids
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Goddess Braids', 'Braiding', 0, 180, 'Large, bold goddess braids - can be worn as crown or down', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 180, 1 FROM services WHERE name = 'Goddess Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 250, 2 FROM services WHERE name = 'Goddess Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 340, 3 FROM services WHERE name = 'Goddess Braids' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Curls / Wavy Ends', 65, 1 FROM services WHERE name = 'Goddess Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 80, 2 FROM services WHERE name = 'Goddess Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Beads & Accessories', 30, 3 FROM services WHERE name = 'Goddess Braids' ON CONFLICT DO NOTHING;

-- Kids Braids
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Kids Braids', 'Braiding', 0, 120, 'Gentle, child-friendly braiding. Ages 3--12', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Cornrows (Simple)', 30, 1 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Cornrows (Detailed)', 50, 2 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Box Braids (Short)', 120, 3 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Box Braids (Medium)', 160, 4 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Fulani (Short)', 130, 5 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Beads', 20, 1 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Color Extension', 50, 2 FROM services WHERE name = 'Kids Braids' ON CONFLICT DO NOTHING;

--  HAIR WASHING & TREATMENT 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Hair Wash & Blow-dry', 'Hair Washing', 0, 60, 'Deep cleanse, condition, and blow-dry finish', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short Hair', 40, 1 FROM services WHERE name = 'Hair Wash & Blow-dry' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium Hair', 55, 2 FROM services WHERE name = 'Hair Wash & Blow-dry' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long Hair', 70, 3 FROM services WHERE name = 'Hair Wash & Blow-dry' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Deep Conditioning Treatment', 50, 1 FROM services WHERE name = 'Hair Wash & Blow-dry' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Scalp Treatment', 40, 2 FROM services WHERE name = 'Hair Wash & Blow-dry' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Protein Treatment', 60, 3 FROM services WHERE name = 'Hair Wash & Blow-dry' ON CONFLICT DO NOTHING;

-- Wash Out (braids/twists removal + wash)
INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Braid Wash & Take Down', 'Hair Washing', 0, 90, 'Careful removal of braids/twists and thorough wash', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Wash Only (client removes own)', 40, 1 FROM services WHERE name = 'Braid Wash & Take Down' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Take Down + Wash (Short)', 60, 2 FROM services WHERE name = 'Braid Wash & Take Down' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Take Down + Wash (Medium)', 80, 3 FROM services WHERE name = 'Braid Wash & Take Down' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Take Down + Wash (Long)', 100, 4 FROM services WHERE name = 'Braid Wash & Take Down' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Deep Conditioning Treatment', 50, 1 FROM services WHERE name = 'Braid Wash & Take Down' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Scalp Treatment', 40, 2 FROM services WHERE name = 'Braid Wash & Take Down' ON CONFLICT DO NOTHING;

--  PEDICURE 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Classic Pedicure', 'Pedicure', 100, 45, 'Soak, scrub, trim, shape, and polish', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Gel Polish', 40, 1 FROM services WHERE name = 'Classic Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 10, 2 FROM services WHERE name = 'Classic Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Paraffin Wax Treatment', 50, 3 FROM services WHERE name = 'Classic Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Callus Removal', 30, 4 FROM services WHERE name = 'Classic Pedicure' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Jelly Pedicure', 'Pedicure', 160, 60, 'Fizzing jelly soak, exfoliation, massage, and polish', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Gel Polish', 40, 1 FROM services WHERE name = 'Jelly Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 10, 2 FROM services WHERE name = 'Jelly Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Paraffin Wax Treatment', 50, 3 FROM services WHERE name = 'Jelly Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Hot Stone Massage', 60, 4 FROM services WHERE name = 'Jelly Pedicure' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Signature Luxury Pedicure', 'Pedicure', 250, 90, 'Full spa pedicure - jelly soak, mask, massage, paraffin, gel polish', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 10, 1 FROM services WHERE name = 'Signature Luxury Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Extended Massage (15 min)', 50, 2 FROM services WHERE name = 'Signature Luxury Pedicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Hot Stone Upgrade', 60, 3 FROM services WHERE name = 'Signature Luxury Pedicure' ON CONFLICT DO NOTHING;

--  MANICURE 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Classic Manicure', 'Manicure', 60, 30, 'Shape, buff, cuticle care, and regular polish', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Gel Polish', 30, 1 FROM services WHERE name = 'Classic Manicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 10, 2 FROM services WHERE name = 'Classic Manicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Paraffin Wax', 40, 3 FROM services WHERE name = 'Classic Manicure' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Gel Manicure', 'Manicure', 100, 45, 'Soak-off gel application - long-lasting, chip-free finish', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 10, 1 FROM services WHERE name = 'Gel Manicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Chrome / Foil Finish', 30, 2 FROM services WHERE name = 'Gel Manicure' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Paraffin Wax', 40, 3 FROM services WHERE name = 'Gel Manicure' ON CONFLICT DO NOTHING;

--  ACRYLIC NAILS 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Acrylic Nails (Full Set)', 'Acrylic Nails', 0, 90, 'Full set of acrylic extensions with your choice of shape and length', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short (Squoval / Round)', 120, 1 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium (Almond / Coffin)', 160, 2 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long (Stiletto / Ballerina)', 220, 3 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'XL (Extra Long)', 300, 4 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 15, 1 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Chrome / Mirror Finish', 40, 2 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Glitter Overlay', 30, 3 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, '3D / Embellishments', 50, 4 FROM services WHERE name = 'Acrylic Nails (Full Set)' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Acrylic Nails (Refill)', 'Acrylic Nails', 0, 60, 'Fill-in for grown-out acrylic nails', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Short', 80, 1 FROM services WHERE name = 'Acrylic Nails (Refill)' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Medium', 100, 2 FROM services WHERE name = 'Acrylic Nails (Refill)' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Long', 130, 3 FROM services WHERE name = 'Acrylic Nails (Refill)' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Nail Art (per nail)', 15, 1 FROM services WHERE name = 'Acrylic Nails (Refill)' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Chrome / Mirror Finish', 40, 2 FROM services WHERE name = 'Acrylic Nails (Refill)' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Shape Change', 20, 3 FROM services WHERE name = 'Acrylic Nails (Refill)' ON CONFLICT DO NOTHING;

--  LASHES 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Classic Lash Extension', 'Lashes', 150, 90, 'One extension per natural lash for a natural, mascara look', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Tint', 40, 1 FROM services WHERE name = 'Classic Lash Extension' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Lift & Set', 60, 2 FROM services WHERE name = 'Classic Lash Extension' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Hybrid Lash Extension', 'Lashes', 200, 100, 'Mix of classic and volume fans for a textured, full look', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Tint', 40, 1 FROM services WHERE name = 'Hybrid Lash Extension' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Bottom Lashes', 50, 2 FROM services WHERE name = 'Hybrid Lash Extension' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Volume / Mega Volume Lashes', 'Lashes', 0, 120, 'Multiple extensions per natural lash for maximum drama', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Volume (2D--4D)', 250, 1 FROM services WHERE name = 'Volume / Mega Volume Lashes' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Mega Volume (5D--10D)', 330, 2 FROM services WHERE name = 'Volume / Mega Volume Lashes' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Bottom Lashes', 50, 1 FROM services WHERE name = 'Volume / Mega Volume Lashes' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Tint', 40, 2 FROM services WHERE name = 'Volume / Mega Volume Lashes' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Lash Refill', 'Lashes', 0, 60, 'Fill-in for grown-out lash extensions (must be within 3 weeks)', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Classic Refill', 80, 1 FROM services WHERE name = 'Lash Refill' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Hybrid Refill', 110, 2 FROM services WHERE name = 'Lash Refill' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Volume Refill', 140, 3 FROM services WHERE name = 'Lash Refill' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Tint', 40, 1 FROM services WHERE name = 'Lash Refill' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Cluster / Strip Lashes', 'Lashes', 50, 20, 'Quick application of cluster or strip lashes for an event look', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Tint', 30, 1 FROM services WHERE name = 'Cluster / Strip Lashes' ON CONFLICT DO NOTHING;

--  MAKEUP 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Full Glam Makeup', 'Makeup', 0, 90, 'Full face makeup for events, parties, or special occasions', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Day / Natural Glam', 200, 1 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Evening / Full Glam', 280, 2 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Bridal Makeup', 400, 3 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lash Application', 30, 1 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Airbrush Finish', 60, 2 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Body / Neck Contour', 50, 3 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Touch-Up Kit (to go)', 40, 4 FROM services WHERE name = 'Full Glam Makeup' ON CONFLICT DO NOTHING;

--  WIG SERVICES 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Wig Install', 'Wigs', 0, 60, 'Professional wig installation - glued, glueless, or sew-in', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Glueless Install', 80, 1 FROM services WHERE name = 'Wig Install' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Glued Lace Front', 120, 2 FROM services WHERE name = 'Wig Install' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Sew-In (Weave)', 180, 3 FROM services WHERE name = 'Wig Install' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Lace Tint', 30, 1 FROM services WHERE name = 'Wig Install' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Baby Hair Styling', 20, 2 FROM services WHERE name = 'Wig Install' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Wig Customization (Plucking / Bleaching)', 60, 3 FROM services WHERE name = 'Wig Install' ON CONFLICT DO NOTHING;

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Wig Styling', 'Wigs', 0, 45, 'Styling of your existing wig - curls, waves, straighten, or cut', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Blow-dry & Style', 60, 1 FROM services WHERE name = 'Wig Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Curl Set', 80, 2 FROM services WHERE name = 'Wig Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Trim & Shape', 70, 3 FROM services WHERE name = 'Wig Styling' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Deep Conditioning Treatment', 50, 1 FROM services WHERE name = 'Wig Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Colour Treatment', 100, 2 FROM services WHERE name = 'Wig Styling' ON CONFLICT DO NOTHING;

--  NATURAL HAIR 

INSERT INTO services (name, category, price, duration_minutes, description, is_active)
VALUES ('Natural Hair Styling', 'Natural Hair', 0, 60, 'Style your natural hair - twist-out, braid-out, bantu knots, or afro', true)
ON CONFLICT DO NOTHING;

INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Twist-Out / Braid-Out', 80, 1 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Bantu Knots', 70, 2 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Defined Afro', 60, 3 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_variants (service_id, name, price_adjustment, sort_order)
SELECT id, 'Flat Twist Updo', 100, 4 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;

INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Deep Conditioning Treatment', 50, 1 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Scalp Treatment', 40, 2 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;
INSERT INTO service_addons (service_id, name, price, sort_order)
SELECT id, 'Hot Oil Treatment', 35, 3 FROM services WHERE name = 'Natural Hair Styling' ON CONFLICT DO NOTHING;

