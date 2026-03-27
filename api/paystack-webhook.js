// Paystack webhook — confirms bookings server-side when payment succeeds
// Set this URL in your Paystack dashboard: https://zolarasalon.com/api/paystack-webhook
import crypto from "crypto";

const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const H = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": "Bearer " + SB_KEY,
  "Prefer": "return=representation",
};

async function sb(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

async function sbPatch(path, body) {
  await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=minimal" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Verify Paystack signature
  if (PAYSTACK_SECRET) {
    const hash = crypto.createHmac("sha512", PAYSTACK_SECRET)
      .update(JSON.stringify(req.body)).digest("hex");
    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const event = req.body;
  if (event.event !== "charge.success") return res.status(200).json({ ok: true });

  const ref = event.data?.reference;
  if (!ref) return res.status(200).json({ ok: true });

  try {
    // Find booking by booking_ref
    const bookings = await sb(`bookings?booking_ref=eq.${encodeURIComponent(ref)}&select=id,deposit_paid,status&limit=1`);
    const booking = bookings[0];

    if (!booking) return res.status(200).json({ ok: true, note: "booking not found" });

    // Already confirmed — idempotent
    if (booking.deposit_paid === true && booking.status === "confirmed") {
      return res.status(200).json({ ok: true, note: "already confirmed" });
    }

    // Confirm the booking
    await sbPatch(`bookings?id=eq.${booking.id}`, {
      deposit_paid: true,
      status: "confirmed",
      payment_ref: ref,
    });

    console.log("Webhook confirmed booking:", booking.id, ref);
    return res.status(200).json({ ok: true, confirmed: booking.id });
  } catch (e) {
    console.error("paystack-webhook:", e.message);
    return res.status(200).json({ ok: true }); // Always 200 to Paystack
  }
}
