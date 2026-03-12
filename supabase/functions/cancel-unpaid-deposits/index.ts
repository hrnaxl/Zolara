// cancel-unpaid-deposits: runs every hour
// Cancels bookings still "pending" with no deposit paid after 2 hours
// Sends SMS to client letting them know their slot was released
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_KEY = Deno.env.get("ARKESEL_API_KEY") || "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const SENDER = "Zolara";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) return "233" + d.slice(1);
  if (d.startsWith("233")) return d;
  return d;
}

async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: SENDER, message, recipients: [formatPhone(phone)] }),
    });
    const data = await res.json();
    return data.status === "success" || res.ok;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 2 hours ago
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Find bookings that are still pending, no deposit paid, created more than 2 hours ago
    // Exclude admin-created bookings (those won't have a booking_ref starting with ZB)
    const { data: expired, error } = await supabase
      .from("bookings")
      .select("id, client_name, client_phone, service_name, preferred_date, preferred_time, booking_ref")
      .eq("status", "pending")
      .eq("deposit_paid", false)
      .lte("created_at", cutoff)
      .not("booking_ref", "is", null); // only online bookings have booking_ref

    if (error) throw error;
    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ cancelled: 0, message: "No expired unpaid bookings" }), { headers: cors });
    }

    let cancelled = 0;
    const results: any[] = [];

    for (const b of expired) {
      // Cancel the booking
      const { error: cancelErr } = await supabase
        .from("bookings")
        .update({ status: "cancelled", notes: "Auto-cancelled: deposit not paid within 2 hours" } as any)
        .eq("id", b.id);

      if (cancelErr) {
        results.push({ booking_id: b.id, result: "error", error: cancelErr.message });
        continue;
      }

      cancelled++;

      // Send SMS if phone exists
      if (b.client_phone) {
        const message =
`Hi ${b.client_name},

Your Zolara booking for ${b.service_name} on ${b.preferred_date} at ${b.preferred_time} was cancelled because the deposit was not received within 2 hours.

Your slot has been released.

To rebook, visit zolarasalon.com or call 0594 365 314.

— Zolara Beauty Studio`;

        await sendSMS(b.client_phone, message);
      }

      results.push({ booking_id: b.id, client: b.client_name, result: "cancelled" });
    }

    console.log(`cancel-unpaid-deposits: cancelled ${cancelled}/${expired.length}`);
    return new Response(JSON.stringify({ cancelled, total: expired.length, results }), { headers: cors });
  } catch (err: any) {
    console.error("cancel-unpaid-deposits error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
