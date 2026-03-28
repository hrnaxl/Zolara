// Called by the booking page immediately after booking creation
// Stores a pending "deposit not recorded" SMS to be sent 7 minutes later
// This replaces the unreliable browser setTimeout

const SB_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY);

const H = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": "Bearer " + SB_KEY,
  "Prefer": "return=representation",
};

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
const allowedOrigins = [process.env.ALLOWED_ORIGIN || "https://zolarasalon.com", "http://localhost:8080", "http://localhost:5173"];
res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { phone, message, booking_id, delay_minutes = 7, cancel } = req.body || {};

    // If cancel=true, mark any unsent pending SMS for this booking as sent (cancel it)
    if (cancel && booking_id) {
      await fetch(`${SB_URL}/rest/v1/pending_sms?booking_id=eq.${booking_id}&sent=eq.false`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ sent: true, sent_at: new Date().toISOString(), delivered: false, note: "cancelled_deposit_paid" }),
      }).catch(() => {});
      return res.status(200).json({ ok: true, cancelled: true });
    }

    if (!phone || !message) return res.status(400).json({ error: "phone and message required" });
    // Cap message length to prevent Arkesel overcharging
    const safeMessage = String(message).slice(0, 480);

    const sendAfter = new Date(Date.now() + delay_minutes * 60 * 1000).toISOString();

    const r = await fetch(`${SB_URL}/rest/v1/pending_sms`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ phone, message: safeMessage, booking_id: booking_id || null, send_after: sendAfter, sent: false }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("queue-pending-sms insert failed:", err);
      return res.status(500).json({ error: "Failed to queue SMS" });
    }

    return res.status(200).json({ ok: true, send_after: sendAfter });
  } catch (e) {
    console.error("queue-pending-sms:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
