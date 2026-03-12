// flag-no-shows: runs every morning at 9 AM Ghana time (GMT)
// Flags confirmed bookings where the appointment date was YESTERDAY and still not checked out
// Uses yesterday (not today) so long services that run until midnight complete properly
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_KEY = Deno.env.get("ARKESEL_API_KEY") || "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const SENDER = "Zolara";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Yesterday's date (Ghana = GMT)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Find bookings that:
    // - Were scheduled for yesterday
    // - Are still "confirmed" (not completed, not cancelled)
    // - deposit_paid = false: if they paid a deposit, admin handles it manually
    //   (they may have arrived late by arrangement — auto-flagging would be wrong)
    const { data: noShows, error } = await supabase
      .from("bookings")
      .select("id, client_name, client_phone, service_name, preferred_date, preferred_time")
      .eq("preferred_date", yesterdayStr)
      .in("status", ["confirmed", "in_progress"])
      .eq("deposit_paid", false);

    if (error) throw error;
    if (!noShows || noShows.length === 0) {
      return new Response(JSON.stringify({ flagged: 0, message: "No no-shows for yesterday" }), { headers: cors });
    }

    let flagged = 0;
    const results: any[] = [];

    for (const b of noShows) {
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          status: "no_show",
          notes: `Auto-flagged as no-show: appointment was ${b.preferred_date} at ${b.preferred_time}, not checked out by 9 AM next day.`,
        } as any)
        .eq("id", b.id);

      if (updateErr) {
        results.push({ booking_id: b.id, result: "error", error: updateErr.message });
        continue;
      }

      flagged++;
      results.push({ booking_id: b.id, client: b.client_name, date: b.preferred_date, result: "flagged" });
    }

    console.log(`flag-no-shows: flagged ${flagged} for ${yesterdayStr}`);
    return new Response(JSON.stringify({ flagged, total: noShows.length, date: yesterdayStr, results }), { headers: cors });
  } catch (err: any) {
    console.error("flag-no-shows error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
