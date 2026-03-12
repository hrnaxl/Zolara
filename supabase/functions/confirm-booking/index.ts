// confirm-booking: marks a booking as deposit paid and confirmed
// Called by frontend after Paystack popup onSuccess — uses service role to bypass RLS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { booking_id, booking_ref, payment_ref, client_name, client_phone, client_email } = await req.json();

    if (!booking_id || !booking_ref) {
      return new Response(JSON.stringify({ error: "booking_id and booking_ref required" }), { status: 400, headers: cors });
    }

    // Service role bypasses all RLS — anon key cannot update bookings
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Confirm the booking
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        deposit_paid: true,
        payment_ref: payment_ref || booking_ref,
        payment_status: "paid",
        status: "confirmed",
      })
      .eq("id", booking_id);

    if (updateErr) throw updateErr;

    // 2. Find or create client and link
    try {
      const phone = client_phone?.replace(/\s/g, "");
      const canonical = phone?.startsWith("0") ? "+233" + phone.slice(1)
                      : phone?.startsWith("233") ? "+" + phone
                      : phone;

      let clientId: string | null = null;

      if (canonical) {
        const forms = [canonical, "0" + canonical.slice(4), "233" + canonical.slice(4)].filter(Boolean);
        const { data: existing } = await supabase.from("clients").select("id, total_visits").in("phone", forms).limit(1).maybeSingle();
        if (existing) clientId = existing.id;
      }

      if (!clientId && client_email) {
        const { data: existing } = await supabase.from("clients").select("id").ilike("email", client_email).limit(1).maybeSingle();
        if (existing) clientId = existing.id;
      }

      if (!clientId) {
        const { data: nc } = await supabase.from("clients").insert({
          name: client_name || "Guest",
          phone: canonical || null,
          email: client_email || null,
          loyalty_points: 0,
          total_visits: 0,
          total_spent: 0,
        }).select("id").single();
        clientId = nc?.id || null;
      }

      if (clientId) {
        await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", booking_id);
      }
    } catch (e: any) {
      console.error("client link error:", e.message);
    }

    return new Response(JSON.stringify({ success: true }), { headers: cors });

  } catch (err: any) {
    console.error("confirm-booking error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
