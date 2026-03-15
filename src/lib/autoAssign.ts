import { supabase } from "@/integrations/supabase/client";

const SPECIALTY_MAP: Record<string, string[]> = {
  "Braider":                  ["braid", "cornrow", "twist", "loc", "feed-in", "knotless", "box braid"],
  "Lash Tech":                ["lash", "extension", "cluster", "volume lash"],
  "Nail Tech":                ["nail", "acrylic", "gel polish", "nail art", "manicure", "french"],
  "Wig & Hair Stylist":       ["wig", "hair", "blow dry", "scalp", "wash"],
  "Makeup Artist":            ["makeup", "make up", "glam", "bridal", "brow", "contour"],
  "Pedicurist & Manicurist":  ["pedicure", "manicure", "feet", "foot"],
};

export function getRequiredSpecialty(serviceName: string): string | null {
  const lower = (serviceName || "").toLowerCase();
  for (const [specialty, keywords] of Object.entries(SPECIALTY_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return specialty;
  }
  return null;
}

/**
 * Auto-assign a staff member to a booking based on specialty and availability.
 * Only called for online bookings. Walk-ins skip this.
 */
export async function autoAssignBooking(bookingId: string, serviceName: string, preferredDate: string, preferredTime: string): Promise<{ staffId: string; staffName: string } | null> {
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

    // 2. Filter by specialty
    const eligible = opStaff.filter((s: any) => {
      if (!specialty) return true;
      return (s.specialties || []).includes(specialty);
    });

    if (eligible.length === 0) return null;

    // 3. For today's bookings — only assign to checked-in staff
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
      pool = eligible.filter((s: any) => presentIds.has(s.id));
      // If nobody is checked in yet (e.g. booking made before 9am), fall back to any eligible
      if (pool.length === 0) pool = eligible;
    }

    // 4. Check time conflicts
    const { data: existingBookings } = await (supabase as any)
      .from("bookings")
      .select("staff_id, preferred_date, preferred_time")
      .in("status", ["confirmed", "in_progress"])
      .not("staff_id", "is", null);

    const available = pool.find((s: any) =>
      !(existingBookings || []).some(
        (b: any) => b.staff_id === s.id && b.preferred_date === preferredDate && b.preferred_time === preferredTime
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
