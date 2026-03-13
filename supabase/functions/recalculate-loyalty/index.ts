import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async () => {
  try {
    // Get all completed bookings with a price and client
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("client_id, price")
      .eq("status", "completed")
      .not("client_id", "is", null)
      .not("price", "is", null)
      .gt("price", 0);

    if (error) throw error;

    // Aggregate total spent per client from bookings
    const totals: Record<string, number> = {};
    for (const b of bookings || []) {
      totals[b.client_id] = (totals[b.client_id] || 0) + Number(b.price);
    }

    // Update each client
    let updated = 0;
    for (const [clientId, totalSpent] of Object.entries(totals)) {
      const points = Math.floor(totalSpent / 100);
      await supabase
        .from("clients")
        .update({ total_spent: totalSpent, loyalty_points: points })
        .eq("id", clientId);
      updated++;
    }

    return new Response(
      JSON.stringify({ ok: true, clients_updated: updated, totals }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
