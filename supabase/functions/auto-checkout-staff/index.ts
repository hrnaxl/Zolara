/**
 * auto-checkout-staff
 * 
 * Supabase Edge Function — runs daily at 23:59 via cron.
 * Closes any staff attendance sessions still open at end of day.
 * 
 * Deploy:  supabase functions deploy auto-checkout-staff
 * 
 * Cron schedule (run in Supabase SQL editor):
 * SELECT cron.schedule(
 *   'auto-checkout-staff-daily',
 *   '59 23 * * *',
 *   $$
 *     SELECT net.http_post(
 *       url := 'https://<your-project-ref>.supabase.co/functions/v1/auto-checkout-staff',
 *       headers := '{"Authorization": "Bearer <your-service-role-key>", "Content-Type": "application/json"}'::jsonb,
 *       body := '{}'::jsonb
 *     ) AS request_id;
 *   $$
 * );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // Only allow POST from authorized callers (service role or cron)
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const now = new Date();
    // Build 23:59:59 for today in local time
    const checkoutTime = new Date(now);
    checkoutTime.setHours(23, 59, 59, 0);

    // Find all open attendance records for today that have not been checked out
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const { data: openSessions, error: fetchErr } = await supabase
      .from("attendance")
      .select("id, staff_id, check_in")
      .is("check_out", null)
      .gte("check_in", todayStart.toISOString())
      .lte("check_in", checkoutTime.toISOString());

    if (fetchErr) throw fetchErr;
    if (!openSessions || openSessions.length === 0) {
      return new Response(JSON.stringify({ message: "No open sessions found", closed: 0 }), { status: 200 });
    }

    const ids = openSessions.map((s: any) => s.id);

    // Close all open sessions — set check_out to 23:59:59 today
    const { error: updateErr } = await supabase
      .from("attendance")
      .update({ check_out: checkoutTime.toISOString(), status: "auto_closed" })
      .in("id", ids)
      .is("check_out", null); // double guard: only update still-open ones

    if (updateErr) throw updateErr;

    console.log(`Auto-closed ${ids.length} open attendance sessions`);
    return new Response(
      JSON.stringify({ message: "Auto-checkout complete", closed: ids.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Auto-checkout error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
