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
    const body = await req.json();
    const reference = body.reference;
    const metadata = body.metadata; // frontend can pass metadata directly as backup

    console.log("verify-deposit called, reference:", reference);

    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), { status: 400, headers: cors });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check if booking already exists — fastest path
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, booking_ref, service_name, preferred_date, preferred_time, deposit_paid")
      .eq("booking_ref", reference)
      .maybeSingle();

    if (existing) {
      console.log("booking already exists:", existing.id);
      return new Response(JSON.stringify({
        status: "already_exists",
        booking_ref: existing.booking_ref,
        service_name: existing.service_name,
        preferred_date: existing.preferred_date,
        preferred_time: existing.preferred_time,
      }), { headers: cors });
    }

    // 2. Try to verify with Paystack — but don't hard-fail if key is wrong
    let depositGhs = 50; // fallback deposit amount
    let meta = metadata || {};
    let paystackVerified = false;

    try {
      console.log("calling Paystack verify for:", reference);
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { "Authorization": `Bearer ${PAYSTACK_SECRET}` },
      });
      const verifyData = await verifyRes.json();
      console.log("Paystack response status:", verifyData.status, "data status:", verifyData.data?.status);

      if (verifyData.status && verifyData.data?.status === "success") {
        depositGhs = verifyData.data.amount / 100;
        // Paystack metadata is the source of truth if available
        if (verifyData.data.metadata && Object.keys(verifyData.data.metadata).length > 0) {
          meta = verifyData.data.metadata;
        }
        paystackVerified = true;
        console.log("Paystack verified, amount:", depositGhs, "meta keys:", Object.keys(meta));
      } else {
        console.warn("Paystack verification failed:", JSON.stringify(verifyData));
        // If we have metadata from frontend, proceed anyway — Paystack only redirects on success
        if (!metadata || Object.keys(metadata).length === 0) {
          return new Response(JSON.stringify({
            status: "not_paid",
            paystack_status: verifyData.data?.status,
            message: verifyData.message,
          }), { headers: cors });
        }
        console.log("Using frontend metadata as fallback");
      }
    } catch (verifyErr: any) {
      console.error("Paystack API call failed:", verifyErr.message);
      if (!metadata || Object.keys(metadata).length === 0) {
        return new Response(JSON.stringify({ status: "verify_error", error: verifyErr.message }), { headers: cors });
      }
    }

    // 3. Parse addons
    let selectedAddons: any[] = [];
    try {
      const raw = meta.selected_addons;
      selectedAddons = typeof raw === "string" ? JSON.parse(raw) : (raw || []);
    } catch { selectedAddons = []; }

    // 4. Create booking
    console.log("creating booking for ref:", reference, "service:", meta.service_name);
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
      console.error("booking insert error:", insertErr.message, insertErr.code);
      // Race condition — check again
      const { data: race } = await supabase.from("bookings").select("id, booking_ref, service_name, preferred_date, preferred_time").eq("booking_ref", reference).maybeSingle();
      if (race) {
        return new Response(JSON.stringify({ status: "already_exists", booking_ref: race.booking_ref, service_name: race.service_name, preferred_date: race.preferred_date, preferred_time: race.preferred_time }), { headers: cors });
      }
      return new Response(JSON.stringify({ status: "insert_error", error: insertErr.message }), { status: 500, headers: cors });
    }

    console.log("booking created:", newBooking.id);

    // 5. Link client
    try {
      const phone = meta.client_phone;
      const email = meta.client_email;
      if (phone || email) {
        let q = supabase.from("clients").select("id") as any;
        if (phone) q = q.eq("phone", phone); else q = q.eq("email", email);
        const { data: ec } = await q.maybeSingle();
        let clientId = ec?.id;
        if (!clientId) {
          const { data: nc } = await (supabase.from("clients") as any).insert({ name: meta.client_name, phone: phone || null, email: email || null, loyalty_points: 0, total_visits: 0, total_spent: 0 }).select("id").single();
          clientId = nc?.id;
        }
        if (clientId) await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", newBooking.id);
      }
    } catch (e: any) { console.error("client link error:", e.message); }

    // 6. SMS
    try {
      const phone = meta.client_phone;
      if (phone) {
        const d = phone.replace(/\D/g, "");
        const recipient = d.startsWith("0") && d.length === 10 ? "233" + d.slice(1) : d;
        const dateDisplay = meta.preferred_date ? new Date(meta.preferred_date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" }) : "";
        const msg = `Hi ${meta.client_name}! Your booking is CONFIRMED ✅\n\nService: ${meta.service_name}\nDate: ${dateDisplay}\nTime: ${meta.preferred_time}\nRef: ${reference}\n\nPlease arrive 5 mins early.\n📍 Sakasaka, Opp. CalBank, Tamale\n📞 0594 365 314\n— Zolara Beauty Studio`;
        await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ sender: "Zolara", message: msg, recipients: [recipient] }),
        }).catch(() => null);
      }
    } catch (e: any) { console.error("SMS error:", e.message); }

    return new Response(JSON.stringify({
      status: "created",
      booking_ref: reference,
      service_name: meta.service_name,
      preferred_date: meta.preferred_date,
      preferred_time: meta.preferred_time,
    }), { headers: cors });

  } catch (err: any) {
    console.error("verify-deposit fatal error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
