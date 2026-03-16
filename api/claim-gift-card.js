const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" };
const TV = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { tier, buyerName, buyerEmail, buyerPhone, paymentRef } = req.body || {};
  if (!tier) return res.status(400).json({ error: "Missing tier" });
  try {
    // Find a pre-printed physical card for this tier
    const findRes = await fetch(
      SB + "/gift_cards?tier=eq." + encodeURIComponent(tier) +
      "&card_type=eq.physical&payment_status=eq.pending&status=eq.active&limit=1&select=id,code,serial_number,tier,amount,balance",
      { headers: H }
    );
    const found = await findRes.json();
    console.log("Find:", findRes.status, JSON.stringify(found));

    if (Array.isArray(found) && found.length > 0) {
      const card = found[0];
      await fetch(SB + "/gift_cards?id=eq." + card.id, {
        method: "PATCH", headers: H,
        body: JSON.stringify({
          payment_status: "pending_pickup",
          buyer_name: buyerName || null,
          buyer_email: buyerEmail || null,
          buyer_phone: buyerPhone || null,
          notes: "RESERVED. Buyer: " + (buyerName||"") + " | " + (buyerPhone||"") + " | Ref: " + (paymentRef||"") + " | " + new Date().toISOString(),
        }),
      });
      return res.status(200).json({ claimed: true, card: { ...card, payment_status: "pending_pickup" } });
    }

    // No stock — create placeholder
    const expires = new Date(); expires.setFullYear(expires.getFullYear() + 1);
    const ins = await fetch(SB + "/gift_cards", {
      method: "POST", headers: H,
      body: JSON.stringify({
        code: "PICKUP-" + Date.now().toString(36).toUpperCase(),
        tier, amount: TV[tier] || 0, balance: TV[tier] || 0,
        status: "active", payment_status: "pending_pickup", card_type: "physical",
        buyer_name: buyerName || null, buyer_email: buyerEmail || null, buyer_phone: buyerPhone || null,
        notes: "NO STOCK. Assign manually. Buyer: " + (buyerName||"") + " | Ref: " + (paymentRef||""),
        expires_at: expires.toISOString(),
      }),
    });
    const inserted = await ins.json();
    const card = Array.isArray(inserted) ? inserted[0] : inserted;
    return res.status(200).json({ claimed: false, card, message: "No stock. Placeholder created." });
  } catch (err) {
    console.error("claim error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
