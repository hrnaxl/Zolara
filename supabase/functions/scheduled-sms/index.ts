import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_API_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const SENDER = "Zolara";
const CONTACT = "0594365314 / 0208848707";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function firstName(name: string): string {
  return (name || "").split(" ")[0] || name;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "233" + digits.slice(1);
  if (digits.startsWith("233")) return digits;
  return digits;
}

async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: SENDER, message, recipients: [formatPhone(phone)] }),
    });
    const data = await res.json();
    return data.status === "success" || res.ok;
  } catch { return false; }
}

// Dedup: log sent SMS to prevent duplicates
async function wasSent(key: string): Promise<boolean> {
  const { data } = await supabase.from("sms_log").select("id").eq("key", key).maybeSingle();
  return !!data;
}
async function markSent(key: string, type: string, phone: string) {
  await supabase.from("sms_log").insert({ key, type, phone }).catch(() => {});
}

// ── REMINDER: 2hrs before appointment ────────────────────────────────────────
async function sendReminders() {
  const now = new Date();
  // Window: bookings starting in 1h50m–2h10m from now
  const lo = new Date(now.getTime() + 110 * 60 * 1000);
  const hi = new Date(now.getTime() + 130 * 60 * 1000);

  const loDate = lo.toISOString().slice(0, 10);
  const hiDate = hi.toISOString().slice(0, 10);
  const loTime = lo.toTimeString().slice(0, 5);
  const hiTime = hi.toTimeString().slice(0, 5);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, client_name, client_phone, service_name, preferred_date, preferred_time, staff:staff_id(name), booking_ref, created_at")
    .in("status", ["confirmed", "pending"])
    .gte("preferred_date", loDate)
    .lte("preferred_date", hiDate);

  if (!bookings) return;

  for (const bk of bookings) {
    if (!bk.client_phone) continue;

    // Build appointment datetime
    const apptDatetime = new Date(`${bk.preferred_date}T${bk.preferred_time || "00:00"}:00`);
    const createdAt    = new Date(bk.created_at);

    // Only send if booked more than 2 hours before appointment
    const diffMs = apptDatetime.getTime() - createdAt.getTime();
    if (diffMs <= 2 * 60 * 60 * 1000) continue;

    // Check time window
    if (apptDatetime < lo || apptDatetime > hi) continue;

    const key = `reminder:${bk.id}`;
    if (await wasSent(key)) continue;

    const staffName = (bk.staff as any)?.name || "our stylist";
    const ref = bk.booking_ref || bk.id.slice(0, 8).toUpperCase();
    const msg = `Hi ${firstName(bk.client_name)}, this is a reminder of your Zolara appointment today.

Service: ${bk.service_name}
Time: ${bk.preferred_time}
Stylist: ${staffName}
Ref: ${ref}

We look forward to serving you.

Zolara Beauty Studio
${CONTACT}`;

    const sent = await sendSMS(bk.client_phone, msg);
    if (sent) await markSent(key, "reminder", bk.client_phone);
  }
}

// ── REBOOKING REMINDER ────────────────────────────────────────────────────────
// Service cycle windows in days — if client hasn't rebooked within window, nudge them
const SERVICE_CYCLES: { pattern: RegExp; minDays: number; maxDays: number }[] = [
  { pattern: /braid|twist|loc/i,       minDays: 21, maxDays: 28 },
  { pattern: /hair|wash|treat|colour/i, minDays: 28, maxDays: 42 },
  { pattern: /nail|pedicure|manicure/i, minDays: 14, maxDays: 21 },
  { pattern: /lash|brow/i,             minDays: 14, maxDays: 21 },
];
const DEFAULT_CYCLE = { minDays: 28, maxDays: 42 };

async function sendRebookingReminders() {
  const now = new Date();

  // Get all clients with at least one completed booking
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, phone")
    .gt("total_visits", 0);

  if (!clients) return;

  for (const client of clients) {
    if (!client.phone) continue;

    // Get their most recent completed booking
    const { data: lastBookings } = await supabase
      .from("bookings")
      .select("id, service_name, preferred_date, status")
      .eq("client_id", client.id)
      .eq("status", "completed")
      .order("preferred_date", { ascending: false })
      .limit(1);

    if (!lastBookings?.length) continue;
    const last = lastBookings[0];

    // Check if they already have a future booking
    const { data: futureBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_id", client.id)
      .in("status", ["pending", "confirmed"])
      .gte("preferred_date", now.toISOString().slice(0, 10))
      .limit(1);

    if (futureBookings?.length) continue; // already has upcoming booking

    // Determine cycle for this service
    const serviceName = last.service_name || "";
    const cycle = SERVICE_CYCLES.find(c => c.pattern.test(serviceName)) || DEFAULT_CYCLE;

    const lastDate    = new Date(last.preferred_date + "T12:00:00");
    const daysSince   = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    // Send reminder in the window between minDays and maxDays since last visit
    if (daysSince < cycle.minDays || daysSince > cycle.maxDays) continue;

    const key = `rebook:${client.id}:${last.id}`;
    if (await wasSent(key)) continue;

    const msg = `Hi ${firstName(client.name)}, it may be time for your next Zolara visit.

Your last service: ${serviceName}

Book your next appointment anytime:
zolarasalon.com

We would love to welcome you back.

Zolara Beauty Studio
${CONTACT}`;

    const sent = await sendSMS(client.phone, msg);
    if (sent) await markSent(key, "rebooking", client.phone);
  }
}

// ── MISSED-YOU (60–90 days inactive) ─────────────────────────────────────────
async function sendMissedYou() {
  const now = new Date();
  const day60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const day90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, phone")
    .gt("total_visits", 0);

  if (!clients) return;

  for (const client of clients) {
    if (!client.phone) continue;

    // Last completed booking
    const { data: lastBookings } = await supabase
      .from("bookings")
      .select("id, preferred_date")
      .eq("client_id", client.id)
      .eq("status", "completed")
      .order("preferred_date", { ascending: false })
      .limit(1);

    if (!lastBookings?.length) continue;
    const lastDate = new Date(lastBookings[0].preferred_date + "T12:00:00");

    // Must be between 60 and 90 days ago
    if (lastDate > day60 || lastDate < day90) continue;

    // Must not have any future booking
    const { data: future } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_id", client.id)
      .in("status", ["pending", "confirmed"])
      .gte("preferred_date", now.toISOString().slice(0, 10))
      .limit(1);

    if (future?.length) continue;

    const key = `missedyou:${client.id}:${lastBookings[0].id}`;
    if (await wasSent(key)) continue;

    const msg = `Hi ${firstName(client.name)}, we have missed seeing you at Zolara.

It has been a while since your last visit and we would love to welcome you back.

Book your next appointment anytime:
zolarasalon.com

We look forward to taking care of you again.

Zolara Beauty Studio
${CONTACT}`;

    const sent = await sendSMS(client.phone, msg);
    if (sent) await markSent(key, "missed_you", client.phone);
  }
}

serve(async (req) => {
  try {
    const { type } = await req.json().catch(() => ({ type: "all" }));
    if (type === "reminder"  || type === "all") await sendReminders();
    if (type === "rebooking" || type === "all") await sendRebookingReminders();
    if (type === "missed_you"|| type === "all") await sendMissedYou();
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
