import { supabase } from "@/integrations/supabase/client";

// Keywords that identify each specialty — used BOTH to detect required specialty
// from service name AND to check if a staff member can do that service.
const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  "Braider":                  ["braid", "cornrow", "twist", "loc", "feed-in", "knotless", "box braid", "braiding", "plaiting"],
  "Lash Tech":                ["lash", "extension", "cluster", "volume lash", "lash tech"],
  "Nail Tech":                ["nail", "acrylic", "gel polish", "nail art", "french", "nail tech"],
  "Wig & Hair Stylist":       ["wig", "hair", "blow dry", "scalp", "wash", "hair stylist"],
  "Makeup Artist":            ["makeup", "make up", "glam", "bridal", "brow", "contour", "makeup artist"],
  "Pedicurist & Manicurist":  ["pedicure", "manicure", "feet", "foot", "pedicurist", "manicurist"],
};

/**
 * Detect which specialty is needed for a given service name.
 * Returns the specialty KEY (e.g. "Braider") or null if no match.
 */
export function getRequiredSpecialty(serviceName: string): string | null {
  const lower = (serviceName || "").toLowerCase();
  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return specialty;
  }
  return null;
}

/**
 * Check if a staff member can perform a given specialty.
 * Matches flexibly: checks both the exact specialty name AND keywords
 * against the staff member's specialties array.
 * This handles DB values like "Braider", "Braiding", "Knotless Braids", etc.
 */
function staffCanDoSpecialty(staffSpecialties: string[], requiredSpecialty: string): boolean {
  if (!staffSpecialties || staffSpecialties.length === 0) return false;
  const keywords = SPECIALTY_KEYWORDS[requiredSpecialty] || [];
  return staffSpecialties.some(s => {
    const sl = s.toLowerCase();
    // Direct match
    if (sl === requiredSpecialty.toLowerCase()) return true;
    // Keyword match — any keyword for this specialty appears in the staff's specialty string
    return keywords.some(kw => sl.includes(kw));
  });
}

/**
 * Auto-assign a staff member to a booking based on specialty and availability.
 * Only called for online bookings. Walk-ins skip this.
 */
export async function autoAssignBooking(
  bookingId: string,
  serviceName: string,
  preferredDate: string,
  preferredTime: string
): Promise<{ staffId: string; staffName: string } | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const isToday = preferredDate === today;
    const specialty = getRequiredSpecialty(serviceName);

    // 1. Fetch active operational staff
    const { data: allStaff } = await (supabase as any)
      .from("staff")
      .select("id, name, specialties, role")
      .eq("is_active", true);

    const opStaff = (allStaff || []).filter((s: any) =>
      !["cleaner", "receptionist"].includes(s.role || "")
    );

    // 2. Filter by specialty (flexible keyword matching)
    const eligible = opStaff.filter((s: any) => {
      if (!specialty) return true;
      return staffCanDoSpecialty(s.specialties || [], specialty);
    });

    if (eligible.length === 0) return null;

    // 3. For today's bookings — prefer checked-in staff but fall back if none present
    let pool = eligible;
    if (isToday) {
      const { data: att } = await (supabase as any)
        .from("attendance")
        .select("staff_id, status, check_in")
        .eq("date", today);
      const presentIds = new Set(
        (att || [])
          .filter((a: any) => a.check_in && a.status !== "absent")
          .map((a: any) => a.staff_id)
      );
      const presentPool = eligible.filter((s: any) => presentIds.has(s.id));
      pool = presentPool.length > 0 ? presentPool : eligible;
    }

    // 4. Check time conflicts — avoid double-booking same staff at same slot
    const { data: existingBookings } = await (supabase as any)
      .from("bookings")
      .select("staff_id, preferred_date, preferred_time")
      .in("status", ["confirmed", "in_progress"])
      .not("staff_id", "is", null);

    const available = pool.find((s: any) =>
      !(existingBookings || []).some(
        (b: any) =>
          b.staff_id === s.id &&
          b.preferred_date === preferredDate &&
          b.preferred_time === preferredTime
      )
    );

    if (!available) return null;

    // 5. Assign
    const { error } = await (supabase as any)
      .from("bookings")
      .update({ staff_id: available.id, staff_name: available.name })
      .eq("id", bookingId);

    if (error) { console.error("Auto-assign update failed:", error); return null; }

    return { staffId: available.id, staffName: available.name };
  } catch (e) {
    console.error("Auto-assign error:", e);
    return null;
  }
}
