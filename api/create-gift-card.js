const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, tierValue, buyerName, buyerEmail, buyerPhone, recipientName, recipientEmail, message, paymentRef } = req.body;
  if (!tier || !tierValue) return res.status(400).json({ error: "Missing tier or value" });

  try {
    const code = `ZGC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/gift_cards`, {
      method: "POST", headers: H,
      body: JSON.stringify({
        code, tier, amount: tierValue, balance: tierValue,
        status: "pending_send", payment_status: "pending_send", card_type: "digital",
        buyer_name: buyerName || null, buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        recipient_name: recipientName || buyerName,
        recipient_email: recipientEmail || null,
        message: message || null,
        notes: `Online purchase. Buyer: ${buyerName} | Ref: ${paymentRef || "N/A"}`,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: "Insert failed", detail: data });
    const card = Array.isArray(data) ? data[0] : data;
    return res.status(200).json({ ok: true, card, code });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
