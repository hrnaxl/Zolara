// Paystack webhook — confirms existing bookings and gift cards on payment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.text();

    // Verify signature (warn only — don't hard reject)
    const signature = req.headers.get("x-paystack-signature");
    if (signature && PAYSTACK_SECRET) {
      const hash = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
      if (hash !== signature) {
        console.warn("Signature mismatch — proceeding anyway");
      }
    }

    const event = JSON.parse(body);
    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true, action: "none" }), { headers: cors });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reference = event.data?.reference;
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: cors });
    }

    // Verify with Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ received: true, action: "unverified" }), { headers: cors });
    }

    const amountGhs = verifyData.data.amount / 100;

    // 1. Gift card payment
    const { data: giftCard } = await supabase
      .from("gift_cards")
      .select("id, card_type, buyer_name, amount")
      .eq("id", reference)
      .eq("payment_status", "pending")
      .maybeSingle();

    if (giftCard) {
      await supabase.from("gift_cards").update({
        payment_ref: reference,
        payment_status: giftCard.card_type === "digital" ? "pending_send" : "paid",
      }).eq("id", giftCard.id);

      await supabase.from("online_purchases").insert({
        purchase_type: "gift_card",
        amount: giftCard.amount,
        payment_ref: reference,
        payment_status: "paid",
        buyer_name: giftCard.buyer_name,
        metadata: { gift_card_id: giftCard.id },
        paid_at: new Date().toISOString(),
      }).select().maybeSingle().catch(() => null);

      // Record gift card sale in sales table so it appears in revenue reports
      await supabase.from("sales").insert({
        amount: giftCard.amount,
        payment_method: "mobile_money",
        status: "completed",
        client_name: giftCard.buyer_name || null,
        service_name: (giftCard.tier || "Gift") + " Gift Card",
        notes: "Gift card purchase online · ref:" + reference,
        payment_date: new Date().toISOString(),
      } as any).catch(() => null);

      return new Response(JSON.stringify({ received: true, action: "gift_card_paid" }), { headers: cors });
    }

    // 2. Booking deposit — booking already exists in DB, just confirm it
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_ref, client_name, client_phone, service_name, preferred_date, preferred_time, deposit_paid")
      .eq("booking_ref", reference)
      .maybeSingle();

    if (booking) {
      if (!booking.deposit_paid) {
        await supabase.from("bookings").update({
          deposit_paid: true,
          deposit_amount: amountGhs,
          payment_ref: reference,
          payment_status: "paid",
          status: "confirmed",
        } as any).eq("id", booking.id);

        // Record deposit as a sale so it appears in revenue reports
        await supabase.from("sales").insert({
          amount: amountGhs,
          payment_method: "mobile_money",
          status: "completed",
          client_name: booking.client_name || null,
          service_name: booking.service_name || null,
          notes: "Deposit payment online - booking: " + booking.booking_ref,
          payment_date: new Date().toISOString(),
        } as any).catch(() => null);
      }
      return new Response(JSON.stringify({ received: true, action: "deposit_confirmed" }), { headers: cors });
    }

    return new Response(JSON.stringify({ received: true, action: "unknown_reference" }), { headers: cors });

  } catch (err: any) {
    console.error("Paystack webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
