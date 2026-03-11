// Auto-checkout Edge Function
// Scheduled to run at 23:58 GMT daily via Supabase cron
// Checks out any staff still clocked in at end of day

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role bypasses RLS
);

Deno.serve(async (req) => {
  try {
    const now = new Date();

    // Set checkout time to 23:58:00 of the current day (Ghana = GMT)
    const checkoutTime = new Date(now);
    checkoutTime.setHours(23, 58, 0, 0);

    // Find all attendance records with no check_out (still clocked in)
    const { data: openRecords, error: fetchErr } = await supabase
      .from("attendance")
      .select("id, staff_id, check_in")
      .is("check_out", null);

    if (fetchErr) throw fetchErr;

    if (!openRecords || openRecords.length === 0) {
      return new Response(
        JSON.stringify({ message: "No open check-ins found.", checked_out: 0 }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Update all open records to check out at 23:58
    const { error: updateErr, count } = await supabase
      .from("attendance")
      .update({
        check_out: checkoutTime.toISOString(),
        status: "auto_checked_out",
      })
      .is("check_out", null);

    if (updateErr) throw updateErr;

    console.log(`Auto-checkout: ${openRecords.length} staff checked out at ${checkoutTime.toISOString()}`);

    return new Response(
      JSON.stringify({
        message: "Auto-checkout complete.",
        checked_out: openRecords.length,
        checkout_time: checkoutTime.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Auto-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
