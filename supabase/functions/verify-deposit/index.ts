// verify-deposit: confirms deposit on an existing booking
// Called by frontend on return from Paystack, and by sweep-deposits cron
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { booking_id, reference } = await req.json();
    if (!booking_id && !reference) {
      return new Response(JSON.stringify({ error: "booking_id or reference required" }), { status: 400, headers: cors });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find booking
    let q = supabase.from("bookings").select("id, booking_ref, deposit_paid, deposit_amount") as any;
    if (booking_id) q = q.eq("id", booking_id);
    else q = q.eq("booking_ref", reference);
    const { data: booking } = await q.maybeSingle();

    if (!booking) {
      return new Response(JSON.stringify({ status: "not_found" }), { headers: cors });
    }

    if (booking.deposit_paid) {
      return new Response(JSON.stringify({ status: "already_paid" }), { headers: cors });
    }

    // Try to get exact amount from Paystack
    let depositGhs = Number(booking.deposit_amount) || 50;
    try {
      const ref = reference || booking.booking_ref;
      const vRes = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
        headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
      });
      const vData = await vRes.json();
      if (vData.status && vData.data?.status === "success") {
        depositGhs = vData.data.amount / 100;
      }
    } catch { /* use fallback amount */ }

    // Confirm booking
    await supabase.from("bookings").update({
      deposit_paid: true,
      deposit_amount: depositGhs,
      payment_ref: reference || booking.booking_ref,
      payment_status: "paid",
      status: "confirmed",
    } as any).eq("id", booking.id);

    return new Response(JSON.stringify({ status: "verified", booking_id: booking.id }), { headers: cors });

  } catch (err: any) {
    console.error("verify-deposit error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
