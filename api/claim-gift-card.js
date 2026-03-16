const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H  = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" };

const TIER_VALUES = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };

async function sbGet(path) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, { headers: H });
  return { ok: r.ok, status: r.status, data: await r.json() };
}

async function sbPatch(table, match, body) {
  const qs = Object.entries(match).map(([k,v]) => k + "=eq." + encodeURIComponent(v)).join("&");
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + qs, {
    method: "PATCH", headers: H, body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, data: await r.json() };
}

async function sbInsert(table, body) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
    method: "POST", headers: H, body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, data: await r.json() };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, buyerName, buyerEmail, buyerPhone, paymentRef } = req.body || {};
  if (!tier) return res.status(400).json({ error: "Missing tier" });

  const amount = TIER_VALUES[tier] || 0;

  try {
    // 1. Find available physical card for this tier
    const find = await sbGet(
      "gift_cards?tier=eq." + encodeURIComponent(tier) +
      "&card_type=eq.physical&payment_status=eq.pending&status=eq.active" +
      "&limit=1&select=id,code,serial_number,tier,amount"
    );

    console.log("Find result:", find.status, JSON.stringify(find.data));

    let card = null;

    if (find.ok && Array.isArray(find.data) && find.data.length > 0) {
      // Found a card — reserve it
      card = find.data[0];

      const patch = await sbPatch("gift_cards", { id: card.id }, {
        payment_status: "pending_pickup",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        notes: "RESERVED FOR PICKUP. Buyer: " + (buyerName||"") + " | Phone: " + (buyerPhone||"") + " | Ref: " + (paymentRef||"") + " | " + new Date().toISOString(),
      });

      console.log("Patch result:", patch.status, JSON.stringify(patch.data));

      if (!patch.ok) {
        // Patch failed — still return the card, log the error
        console.error("Patch failed but card found:", patch.data);
      }

      return res.status(200).json({ claimed: true, card, message: "Card reserved for pickup" });

    } else {
      // No pre-printed card in stock — create a placeholder
      console.warn("No " + tier + " physical card in stock — creating placeholder");

      const code = "PICKUP-" + Date.now().toString(36).toUpperCase();
      const insert = await sbInsert("gift_cards", {
        code,
        tier,
        amount,
        balance: amount,
        status: "active",
        payment_status: "pending_pickup",
        card_type: "physical",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        notes: "NO STOCK. ASSIGN PHYSICAL CARD MANUALLY. Buyer: " + (buyerName||"") + " | Phone: " + (buyerPhone||"") + " | Ref: " + (paymentRef||""),
      });

      console.log("Placeholder insert:", insert.status, JSON.stringify(insert.data));

      const inserted = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      return res.status(200).json({ claimed: false, card: inserted, message: "No stock. Placeholder created. Assign card manually." });
    }

  } catch (err) {
    console.error("Claim error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
