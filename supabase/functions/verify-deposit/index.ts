// verify-deposit: frontend fallback when webhook hasn't fired yet
// 1. Checks if booking already exists for this ref
// 2. If not, verifies payment with Paystack and CREATES the booking from metadata
// 3. Works completely independently of the webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const ARKESEL_KEY = Deno.env.get("ARKESEL_API_KEY") || "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), { status: 400, headers: cors });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check if booking already exists
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, booking_ref, service_name, preferred_date, preferred_time, deposit_paid, status")
      .eq("booking_ref", reference)
      .maybeSingle();

    if (existing && existing.deposit_paid) {
      return new Response(JSON.stringify({
        status: "already_exists",
        booking_ref: existing.booking_ref,
        service_name: existing.service_name,
        preferred_date: existing.preferred_date,
        preferred_time: existing.preferred_time,
      }), { headers: cors });
    }

    // 2. Verify payment with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ status: "not_paid", paystack_status: verifyData.data?.status }), { headers: cors });
    }

    const depositGhs = verifyData.data.amount / 100;
    const meta = verifyData.data.metadata || {};

    // 3. Parse addons
    let selectedAddons = [];
    try {
      const raw = meta.selected_addons;
      selectedAddons = typeof raw === "string" ? JSON.parse(raw) : (raw || []);
    } catch { selectedAddons = []; }

    // 4. Create booking
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
        payment_ref: reference,
        payment_status: "paid",
        client_id: null,
        duration_minutes: 0,
      } as any)
      .select("id")
      .single();

    if (insertErr) {
      // Could be duplicate key if webhook fired at same time — check again
      const { data: race } = await supabase
        .from("bookings")
        .select("id, booking_ref, service_name, preferred_date, preferred_time")
        .eq("booking_ref", reference)
        .maybeSingle();
      if (race) {
        return new Response(JSON.stringify({
          status: "already_exists",
          booking_ref: race.booking_ref,
          service_name: race.service_name,
          preferred_date: race.preferred_date,
          preferred_time: race.preferred_time,
        }), { headers: cors });
      }
      throw insertErr;
    }

    // 5. Create/link client
    try {
      const phone = meta.client_phone;
      const email = meta.client_email;
      if (phone || email) {
        let q = supabase.from("clients").select("id") as any;
        if (phone) q = q.eq("phone", phone);
        else q = q.eq("email", email);
        const { data: existingClient } = await q.maybeSingle();
        let clientId = existingClient?.id;
        if (!clientId) {
          const { data: nc } = await supabase.from("clients").insert({
            name: meta.client_name, phone: phone || null, email: email || null,
            loyalty_points: 0, total_visits: 0, total_spent: 0,
          } as any).select("id").single();
          clientId = nc?.id;
        }
        if (clientId) {
          await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", newBooking.id);
        }
      }
    } catch (e) { console.error("client link error:", e); }

    // 6. Send SMS
    try {
      const phone = meta.client_phone;
      if (phone) {
        const formatted = phone.replace(/\D/g, "");
        const recipient = formatted.startsWith("0") && formatted.length === 10
          ? "233" + formatted.slice(1) : formatted;
        const dateDisplay = meta.preferred_date
          ? new Date(meta.preferred_date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })
          : meta.preferred_date;
        const msg = `Hi ${meta.client_name}! Your booking is CONFIRMED ✅\n\nService: ${meta.service_name}\nDate: ${dateDisplay}\nTime: ${meta.preferred_time}\nRef: ${reference}\n\nPlease arrive 5 mins early.\n\n📍 Sakasaka, Opp. CalBank, Tamale\n📞 0594 365 314\n— Zolara Beauty Studio`;
        await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ sender: "Zolara", message: msg, recipients: [recipient] }),
        }).catch(() => null);
      }
    } catch (e) { console.error("SMS error:", e); }

    return new Response(JSON.stringify({
      status: "created",
      booking_ref: reference,
      service_name: meta.service_name,
      preferred_date: meta.preferred_date,
      preferred_time: meta.preferred_time,
    }), { headers: cors });

  } catch (err: any) {
    console.error("verify-deposit error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
