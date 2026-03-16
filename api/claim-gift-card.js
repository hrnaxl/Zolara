const https = require("https");

const SUPABASE_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

function sbRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey": SERVICE_KEY,
      "Authorization": "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request({ hostname: SUPABASE_HOST, path: "/rest/v1/" + path, method, headers }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const TIER_VALUES = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, buyerName, buyerEmail, buyerPhone, paymentRef } = req.body || {};
  if (!tier) return res.status(400).json({ error: "Missing tier" });

  const tierValue = TIER_VALUES[tier] || 0;

  try {
    // 1. Find available physical card for this tier
    const find = await sbRequest("GET",
      "gift_cards?tier=eq." + encodeURIComponent(tier) +
      "&card_type=eq.physical&payment_status=eq.pending&status=eq.active&limit=1&select=id,code,serial_number,tier,amount"
    );
    console.log("Find:", find.status, JSON.stringify(find.data));

    let card;

    if (!Array.isArray(find.data) || find.data.length === 0) {
      // No stock — create placeholder
      console.warn("No " + tier + " card in stock, creating placeholder");
      const insert = await sbRequest("POST", "gift_cards", {
        code: "PICKUP-" + Date.now(),
        tier, amount: tierValue, balance: tierValue,
        status: "active", payment_status: "pending_pickup",
        card_type: "physical",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        notes: "No pre-printed stock. Payment: " + (paymentRef || ""),
      });
      card = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      return res.status(200).json({ claimed: false, card, message: "No stock — placeholder created" });
    }

    card = find.data[0];

    // 2. Reserve it — update payment_status first (critical)
    const patch = await sbRequest("PATCH", "gift_cards?id=eq." + card.id, {
      payment_status: "pending_pickup",
      buyer_name: buyerName || null,
      buyer_email: buyerEmail || null,
      buyer_phone: buyerPhone || null,
      notes: "Reserved. Buyer: " + (buyerName || "") + " | Phone: " + (buyerPhone || "") + " | Ref: " + (paymentRef || ""),
    });
    console.log("Patch:", patch.status, JSON.stringify(patch.data));

    if (patch.status >= 400) {
      // Try minimal patch if buyer columns don't exist
      const minPatch = await sbRequest("PATCH", "gift_cards?id=eq." + card.id, { payment_status: "pending_pickup" });
      console.log("Min patch:", minPatch.status, JSON.stringify(minPatch.data));
      if (minPatch.status >= 400) return res.status(500).json({ error: "Failed to reserve card", detail: minPatch.data });
    }

    console.log("Reserved:", card.id, card.code);
    return res.status(200).json({ claimed: true, card, message: "Card reserved for pickup" });

  } catch (err) {
    console.error("Claim error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
