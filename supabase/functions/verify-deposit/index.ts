// verify-deposit: called from frontend when Paystack returns to booking page
// Checks payment status with Paystack and updates booking if confirmed
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

    // Look up booking by id OR booking_ref
    let bookingQuery = supabase.from("bookings").select("id, booking_ref, client_name, service_name, deposit_paid, deposit_amount, status");
    if (booking_id) {
      bookingQuery = bookingQuery.eq("id", booking_id);
    } else {
      bookingQuery = bookingQuery.eq("booking_ref", reference);
    }
    const { data: booking, error: bErr } = await bookingQuery.maybeSingle();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: cors });
    }

    // If already confirmed, return success immediately
    if (booking.deposit_paid) {
      return new Response(JSON.stringify({ status: "already_paid", booking_id: booking.id }), { headers: cors });
    }

    // Verify with Paystack using the booking_ref as reference
    const ref = reference || booking.booking_ref;
    if (!ref) {
      return new Response(JSON.stringify({ error: "No reference to verify" }), { status: 400, headers: cors });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ status: "not_paid", paystack: verifyData.data?.status }), { headers: cors });
    }

    const depositGhs = verifyData.data.amount / 100;
    const paymentRef = verifyData.data.reference;

    // Update booking
    await supabase.from("bookings").update({
      deposit_paid: true,
      deposit_amount: depositGhs,
      payment_ref: paymentRef,
      payment_status: "paid",
      status: "confirmed",
    } as any).eq("id", booking.id);

    // Insert sales record (ignore duplicate errors)
    await supabase.from("sales").insert({
      booking_id: booking.id,
      amount: depositGhs,
      payment_method: "deposit",
      status: "completed",
      client_name: booking.client_name || null,
      service_name: booking.service_name || null,
      notes: `Paystack deposit — ref: ${paymentRef}`,
    }).catch(() => null);

    return new Response(JSON.stringify({ status: "verified", booking_id: booking.id, amount: depositGhs }), { headers: cors });

  } catch (err: any) {
    console.error("verify-deposit error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
