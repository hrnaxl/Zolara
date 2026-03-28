const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

async function verifyPaystackRef(ref) {
  if (!ref) return true;
  if (!PAYSTACK_SECRET) return true; // skip if not configured
  try {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });
    const d = await r.json();
    return d?.data?.status === 'success';
  } catch { return false; }
}

const SB = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) + "/rest/v1";
const SK = (process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY);
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=minimal" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://zolarasalon.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  const { id, paymentRef } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing id" });
  // Verify Paystack payment before marking sold
  if (PAYSTACK_SECRET && paymentRef) {
    const verified = await verifyPaystackRef(paymentRef);
    if (!verified) return res.status(402).json({ error: "Payment not verified" });
  }
  await fetch(`${SB}/gift_cards?id=eq.${id}`, {
    method: "PATCH", headers: H,
    body: JSON.stringify({ payment_status: "sold", status: "active" }),
  });
  return res.status(200).json({ ok: true });
}
