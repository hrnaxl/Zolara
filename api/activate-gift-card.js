const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { giftCardId, paymentRef } = req.body || {};
  if (!giftCardId) return res.status(400).json({ error: "Missing giftCardId" });
  try {
    const r = await fetch(SB + "/gift_cards?id=eq." + giftCardId, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ status: "active", payment_status: "paid", payment_ref: paymentRef || null }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: "Update failed", detail: d });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
