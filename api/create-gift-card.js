const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" };
const TV = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };
const C = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const r4 = () => Array.from({length:4}, () => C[Math.floor(Math.random()*C.length)]).join("");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { tier, buyerName, buyerEmail, buyerPhone, recipientName, recipientEmail, message } = req.body || {};
  if (!tier) return res.status(400).json({ error: "Missing tier" });
  const amount = TV[tier] || 0;
  const code = tier.substring(0,3).toUpperCase() + "-" + r4() + "-" + r4();
  const expires = new Date(); expires.setFullYear(expires.getFullYear() + 1);
  try {
    const r = await fetch(SB + "/gift_cards", {
      method: "POST", headers: H,
      body: JSON.stringify({
        code, tier, amount, balance: amount,
        status: "active", payment_status: "paid", card_type: "digital",
        buyer_name: buyerName || null, buyer_email: buyerEmail || null, buyer_phone: buyerPhone || null,
        recipient_name: recipientName || buyerName || null,
        recipient_email: recipientEmail || buyerEmail || null,
        message: message || null, expires_at: expires.toISOString(),
      }),
    });
    const d = await r.json();
    console.log("Create:", r.status, JSON.stringify(d));
    if (!r.ok) return res.status(500).json({ error: "Insert failed", detail: d });
    const card = Array.isArray(d) ? d[0] : d;
    return res.status(200).json({ ok: true, card });
  } catch (err) {
    console.error("create error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
