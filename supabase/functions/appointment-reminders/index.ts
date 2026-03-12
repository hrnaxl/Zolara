// appointment-reminders: runs daily at 8 AM Ghana time (GMT)
// Finds all confirmed bookings for tomorrow and sends reminder SMS
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
    // Tomorrow's date in Ghana (GMT)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Get all confirmed bookings for tomorrow with staff info
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, client_name, client_phone, service_name, preferred_date, preferred_time, staff_id, staff:staff_id(name)")
      .eq("preferred_date", tomorrowStr)
      .in("status", ["confirmed", "pending"])
      .not("client_phone", "is", null);

    if (error) throw error;
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No bookings for tomorrow" }), { headers: cors });
    }

    let sent = 0;
    const results: any[] = [];

    for (const b of bookings) {
      if (!b.client_phone) continue;
      const staffName = (b.staff as any)?.name || "your stylist";
      const dateFormatted = new Date(b.preferred_date + "T12:00:00").toLocaleDateString("en-GH", {
        weekday: "long", day: "numeric", month: "long"
      });

      const message =
`Hi ${b.client_name}! Just a reminder 💛

Your Zolara appointment is TOMORROW.

Service: ${b.service_name}
Date: ${dateFormatted}
Time: ${b.preferred_time}
Stylist: ${staffName}

Need to reschedule? Call 0594 365 314 at least 24 hrs before.

📍 Sakasaka, Opp. CalBank, Tamale
— Zolara Beauty Studio`;

      const ok = await sendSMS(b.client_phone, message);
      if (ok) sent++;
      results.push({ booking_id: b.id, client: b.client_name, sent: ok });
    }

    console.log(`appointment-reminders: ${sent}/${bookings.length} sent for ${tomorrowStr}`);
    return new Response(JSON.stringify({ sent, total: bookings.length, date: tomorrowStr, results }), { headers: cors });
  } catch (err: any) {
    console.error("appointment-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
