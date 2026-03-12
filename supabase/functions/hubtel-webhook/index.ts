// DEPRECATED: Replaced by Paystack. Do not deploy.
// ================================================================
// HUBTEL WEBHOOK — receives payment confirmations
// Handles: gift card purchases + booking deposits
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    console.log("[Hubtel Webhook]", JSON.stringify(body));

    const status = body?.Data?.Status || body?.status;
    const clientReference = body?.Data?.ClientReference || body?.clientReference;
    const paymentRef = body?.Data?.TransactionId || body?.transactionId || clientReference;

    if (!clientReference) {
      return new Response(JSON.stringify({ error: "Missing clientReference" }), { status: 400 });
    }

    if (status !== "Success" && status !== "successful" && status !== "Successful") {
      // Payment failed or pending — no action needed
      return new Response(JSON.stringify({ received: true, action: "none" }), { status: 200 });
    }

    // Determine what this payment is for by checking both tables
    // 1. Check gift_cards
    const { data: giftCard } = await supabase
      .from("gift_cards")
      .select("id, card_type, tier, recipient_email, recipient_name, amount, buyer_name")
      .eq("id", clientReference)
      .eq("payment_status", "pending")
      .maybeSingle();

    if (giftCard) {
      // Mark gift card as paid
      await supabase.from("gift_cards").update({
        payment_ref: paymentRef,
        payment_status: "paid",
        status: giftCard.card_type === "digital" ? "pending_send" : "unused",
      }).eq("id", giftCard.id);

      // For digital cards, schedule the email via a queue (10 min delay handled by cron)
      if (giftCard.card_type === "digital") {
        await supabase.from("online_purchases").insert({
          purchase_type: "gift_card",
          amount: giftCard.amount,
          payment_ref: paymentRef,
          payment_status: "paid",
          buyer_name: giftCard.buyer_name,
          metadata: { gift_card_id: giftCard.id },
          paid_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ received: true, action: "gift_card_paid" }), { status: 200 });
    }

    // 2. Check bookings (deposit)
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_name, service_name")
      .eq("payment_ref", clientReference)
      .eq("deposit_paid", false)
      .maybeSingle();

    if (booking) {
      await supabase.from("bookings").update({
        deposit_paid: true,
        deposit_amount: 50,
        status: "confirmed",
      }).eq("id", booking.id);

      return new Response(JSON.stringify({ received: true, action: "deposit_paid" }), { status: 200 });
    }

    return new Response(JSON.stringify({ received: true, action: "unknown_reference" }), { status: 200 });
  } catch (err: any) {
    console.error("[Hubtel Webhook Error]", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
