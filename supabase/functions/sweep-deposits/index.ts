// sweep-deposits: finds all bookings where client paid a deposit via Paystack
// but webhook failed to mark them. Verifies each against Paystack and updates.
// Called by Supabase cron (schedule via Dashboard → Functions → sweep-deposits → Cron: every 15 min)
// Safe to run repeatedly — idempotent (skips already-paid bookings)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Find bookings that:
    // - have a booking_ref (went through Paystack flow)
    // - are NOT marked deposit_paid
    // - are not completed or cancelled (still active)
    // - created within last 30 days (no point checking old ones)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pending, error } = await supabase
      .from("bookings")
      .select("id, booking_ref, client_name, service_name, deposit_paid, status")
      .eq("deposit_paid", false)
      .not("booking_ref", "is", null)
      .not("status", "in", '("completed","cancelled")')
      .gte("created_at", cutoff);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ swept: 0, verified: 0 }), { headers: cors });
    }

    let verified = 0;
    const results: any[] = [];

    for (const booking of pending) {
      try {
        // Verify with Paystack
        const res = await fetch(`https://api.paystack.co/transaction/verify/${booking.booking_ref}`, {
          headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
        });
        const data = await res.json();

        if (!data.status || data.data?.status !== "success") {
          results.push({ booking_id: booking.id, result: "not_paid", paystack_status: data.data?.status });
          continue;
        }

        const depositGhs = data.data.amount / 100;
        const paymentRef = data.data.reference;

        // Mark booking
        await supabase.from("bookings").update({
          deposit_paid: true,
          deposit_amount: depositGhs,
          payment_ref: paymentRef,
          payment_status: "paid",
          status: "confirmed",
        } as any).eq("id", booking.id);

        // Check if sales record already exists for this booking deposit to avoid duplication
        const { data: existing } = await supabase
          .from("sales")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("payment_method", "deposit")
          .maybeSingle();

        if (!existing) {
          await supabase.from("sales").insert({
            booking_id: booking.id,
            amount: depositGhs,
            payment_method: "deposit",
            status: "completed",
            client_name: booking.client_name || null,
            service_name: booking.service_name || null,
            notes: `Paystack deposit (sweep) — ref: ${paymentRef}`,
          });
        }

        verified++;
        results.push({ booking_id: booking.id, result: "verified", amount: depositGhs });
      } catch (e: any) {
        results.push({ booking_id: booking.id, result: "error", error: e.message });
      }
    }

    console.log(`sweep-deposits: checked ${pending.length}, verified ${verified}`);
    return new Response(
      JSON.stringify({ swept: pending.length, verified, results }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sweep-deposits error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
