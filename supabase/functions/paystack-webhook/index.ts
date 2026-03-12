// Paystack webhook handler — replaces hubtel-webhook
// Verifies payment and updates gift_cards or bookings
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.text();
    
    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    if (signature) {
      const hash = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
      if (hash !== signature) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: cors });
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
    const paymentRef = reference;

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

    // 1. Check gift_cards (reference = gift card id)
    const { data: giftCard } = await supabase
      .from("gift_cards")
      .select("id, card_type, tier, recipient_email, recipient_name, amount, buyer_name")
      .eq("id", reference)
      .eq("payment_status", "pending")
      .maybeSingle();

    if (giftCard) {
      await supabase.from("gift_cards").update({
        payment_ref: paymentRef,
        payment_status: giftCard.card_type === "digital" ? "pending_send" : "paid",
        // status stays "active" — email cron reads payment_status="pending_send" to queue send
      }).eq("id", giftCard.id);

      // Log to online_purchases
      await supabase.from("online_purchases").insert({
        purchase_type: "gift_card",
        amount: giftCard.amount,
        payment_ref: paymentRef,
        payment_status: "paid",
        buyer_name: giftCard.buyer_name,
        metadata: { gift_card_id: giftCard.id },
        paid_at: new Date().toISOString(),
      }).select().maybeSingle().catch(() => null);

      return new Response(JSON.stringify({ received: true, action: "gift_card_paid" }), { headers: cors });
    }

    // 2. Check if this is a booking deposit (reference starts with ZB)
    if (reference.startsWith("ZB")) {
      const depositGhs = verifyData.data.amount / 100;
      const meta = verifyData.data.metadata || {};

      // Idempotency: check if booking already created for this ref
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id, booking_ref, client_name, client_phone, service_name, preferred_date, preferred_time")
        .eq("booking_ref", reference)
        .maybeSingle();

      if (existingBooking) {
        // Already processed — ensure it's marked confirmed
        await supabase.from("bookings").update({
          deposit_paid: true,
          deposit_amount: depositGhs,
          payment_ref: paymentRef,
          payment_status: "paid",
          status: "confirmed",
        } as any).eq("id", existingBooking.id);

        return new Response(JSON.stringify({ received: true, action: "deposit_already_recorded" }), { headers: cors });
      }

      // Parse addons from metadata (stringified JSON or array)
      let selectedAddons = [];
      try {
        const raw = meta.selected_addons;
        selectedAddons = typeof raw === "string" ? JSON.parse(raw) : (raw || []);
      } catch { selectedAddons = []; }

      // Create the booking now that payment is confirmed
      const { data: newBooking, error: insertErr } = await supabase
        .from("bookings")
        .insert({
          client_name: meta.client_name || null,
          client_email: meta.client_email || null,
          client_phone: meta.client_phone || null,
          service_id: meta.service_id || null,
          service_name: meta.service_name || null,
          variant_id: meta.variant_id || null,
          variant_name: meta.variant_name || null,
          selected_addons: selectedAddons,
          preferred_date: meta.preferred_date || null,
          preferred_time: meta.preferred_time || null,
          price: meta.price ? Number(meta.price) : null,
          deposit_amount: depositGhs,
          deposit_paid: true,
          notes: meta.notes || null,
          status: "confirmed",
          booking_ref: reference,
          payment_ref: paymentRef,
          payment_status: "paid",
          client_id: null,
        } as any)
        .select("id")
        .single();

      if (insertErr) {
        console.error("Booking insert error:", insertErr);
        return new Response(JSON.stringify({ error: "Booking creation failed", details: insertErr.message }), { status: 500, headers: cors });
      }

      // Create/find client and link
      try {
        const phone = meta.client_phone;
        const email = meta.client_email;
        const clientName = meta.client_name;
        if (phone || email) {
          let clientQuery = supabase.from("clients").select("id");
          if (phone) clientQuery = (clientQuery as any).eq("phone", phone);
          else if (email) clientQuery = (clientQuery as any).eq("email", email);
          const { data: existingClient } = await (clientQuery as any).maybeSingle();

          let clientId = existingClient?.id;
          if (!clientId) {
            const { data: newClient } = await supabase.from("clients").insert({
              name: clientName, phone: phone || null, email: email || null,
              loyalty_points: 0, total_visits: 0, total_spent: 0,
            } as any).select("id").single();
            clientId = newClient?.id;
          }
          if (clientId) {
            await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", newBooking.id);
          }
        }
      } catch (clientErr) {
        console.error("Client link error:", clientErr);
      }

      // Insert sales record for deposit
      await supabase.from("sales").insert({
        booking_id: newBooking.id,
        amount: depositGhs,
        payment_method: "deposit",
        status: "completed",
        client_name: meta.client_name || null,
        service_name: meta.service_name || null,
        notes: `Paystack deposit — ref: ${paymentRef}`,
      }).catch((e: any) => console.error("Sales insert error:", e));

      // Send confirmation SMS
      try {
        const phone = meta.client_phone;
        const name = meta.client_name || "Valued Client";
        const service = meta.service_name || "your service";
        const date = meta.preferred_date || "";
        const time = meta.preferred_time || "";
        if (phone) {
          const formatted = phone.replace(/\D/g, "");
          const recipient = formatted.startsWith("0") && formatted.length === 10
            ? "233" + formatted.slice(1) : formatted;
          const dateDisplay = date
            ? new Date(date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })
            : date;
          const smsBody = `Hi ${name}! Your booking is CONFIRMED ✅\n\nService: ${service}\nDate: ${dateDisplay}\nTime: ${time}\nRef: ${reference}\n\nPlease arrive 5 mins early.\n\n📍 Sakasaka, Opp. CalBank, Tamale\n📞 0594 365 314\n— Zolara Beauty Studio`;
          await fetch("https://sms.arkesel.com/api/v2/sms/send", {
            method: "POST",
            headers: { "api-key": Deno.env.get("ARKESEL_API_KEY") || "S0JhVWFlcm1VV1pkSWJvWnpacEs", "Content-Type": "application/json" },
            body: JSON.stringify({ sender: "Zolara", message: smsBody, recipients: [recipient] }),
          }).catch(() => null);
        }
      } catch (smsErr) {
        console.error("SMS error:", smsErr);
      }

      return new Response(JSON.stringify({ received: true, action: "booking_created", booking_id: newBooking.id }), { headers: cors });
    }

    return new Response(JSON.stringify({ received: true, action: "unknown_reference" }), { headers: cors });

  } catch (err: any) {
    console.error("Paystack webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
