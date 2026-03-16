/**
 * Zolara claim-gift-card — finds a pre-printed physical card and reserves it for pickup
 * Called when client pays online and chooses "store pickup"
 */
const https = require("https");

const SB_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const TIER_VALUES = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };

function sbReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey": SK,
      "Authorization": "Bearer " + SK,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(
      { hostname: SB_HOST, port: 443, path: "/rest/v1/" + path, method, headers },
      (res) => {
        let buf = "";
        res.on("data", (c) => { buf += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
          catch (e) { resolve({ status: res.statusCode, data: buf }); }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

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
    // Find one available pre-printed card: physical, pending payment, active
    const findPath = "gift_cards?" +
      "tier=eq." + encodeURIComponent(tier) +
      "&card_type=eq.physical" +
      "&payment_status=eq.pending" +
      "&status=eq.active" +
      "&limit=1" +
      "&select=id,code,serial_number,tier,amount,balance";

    const find = await sbReq("GET", findPath, null);
    console.log("Find physical card:", find.status, JSON.stringify(find.data));

    if (find.status === 200 && Array.isArray(find.data) && find.data.length > 0) {
      // Found a pre-printed card — reserve it
      const card = find.data[0];
      const note = "RESERVED FOR PICKUP — Buyer: " + (buyerName || "Unknown") +
        " | Phone: " + (buyerPhone || "") +
        " | Email: " + (buyerEmail || "") +
        " | PayRef: " + (paymentRef || "") +
        " | Date: " + new Date().toISOString();

      const patch = await sbReq("PATCH", "gift_cards?id=eq." + card.id, {
        payment_status: "pending_pickup",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        notes: note,
      });
      console.log("Reserve card:", patch.status, JSON.stringify(patch.data));

      return res.status(200).json({
        claimed: true,
        card: { ...card, payment_status: "pending_pickup" },
        message: "Card reserved for pickup",
      });

    } else {
      // No pre-printed stock — create a placeholder record so the purchase is tracked
      console.warn("No " + tier + " physical card in stock — creating placeholder");
      const code = "PICKUP-" + Date.now().toString(36).toUpperCase();
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);

      const insert = await sbReq("POST", "gift_cards", {
        code,
        tier,
        amount: tierValue,
        balance: tierValue,
        status: "active",
        payment_status: "pending_pickup",
        card_type: "physical",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        notes: "⚠️ NO PRE-PRINTED CARD IN STOCK. Assign manually. Buyer: " +
          (buyerName || "") + " | Phone: " + (buyerPhone || "") +
          " | PayRef: " + (paymentRef || ""),
        expires_at: expires.toISOString(),
      });
      console.log("Placeholder insert:", insert.status, JSON.stringify(insert.data));

      const inserted = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      return res.status(200).json({
        claimed: false,
        card: inserted,
        message: "No stock. Placeholder created. Assign physical card manually.",
      });
    }

  } catch (err) {
    console.error("claim-gift-card error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
