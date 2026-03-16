const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, buyerName, buyerEmail, buyerPhone, paymentRef } = req.body || {};
  if (!tier) return res.status(400).json({ error: "Missing tier" });

  const TIER_VALUES = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };
  const tierValue = TIER_VALUES[tier] || 0;

  try {
    // 1. Find an available physical card for this tier
    const findRes = await fetch(
      SUPABASE_URL + "/rest/v1/gift_cards?tier=eq." + encodeURIComponent(tier) +
      "&card_type=eq.physical&payment_status=eq.pending&status=eq.active&limit=1&select=id,code,serial_number,tier,amount",
      { headers: H }
    );
    const findData = await findRes.json();
    console.log("Find result:", findRes.status, JSON.stringify(findData));

    if (!Array.isArray(findData) || findData.length === 0) {
      // No stock — create placeholder
      console.warn("No " + tier + " physical card in stock — creating placeholder");
      const placeholderRes = await fetch(SUPABASE_URL + "/rest/v1/gift_cards", {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          code: "PICKUP-" + Date.now(),
          tier: tier,
          amount: tierValue,
          balance: tierValue,
          status: "active",
          payment_status: "pending_pickup",
          card_type: "physical",
        }),
      });
      const placeholder = await placeholderRes.json();
      const card = Array.isArray(placeholder) ? placeholder[0] : placeholder;
      return res.status(200).json({ claimed: false, card, message: "No stock — placeholder created. Assign manually." });
    }

    const card = findData[0];

    // 2. Mark card as pending_pickup — ONLY update payment_status (always exists)
    const patchRes = await fetch(
      SUPABASE_URL + "/rest/v1/gift_cards?id=eq." + card.id,
      {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ payment_status: "pending_pickup" }),
      }
    );
    const patchData = await patchRes.json();
    console.log("Patch result:", patchRes.status, JSON.stringify(patchData));

    if (!patchRes.ok) {
      console.error("Patch failed:", patchData);
      return res.status(500).json({ error: "Failed to reserve card", detail: patchData });
    }

    // 3. Try to update buyer info — best effort, don't fail if columns missing
    try {
      await fetch(SUPABASE_URL + "/rest/v1/gift_cards?id=eq." + card.id, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({
          buyer_name: buyerName || null,
          buyer_email: buyerEmail || null,
          buyer_phone: buyerPhone || null,
          notes: "RESERVED FOR PICKUP. Buyer: " + (buyerName||"") + " | Phone: " + (buyerPhone||"") + " | Ref: " + (paymentRef||""),
        }),
      });
    } catch (e) {
      console.warn("Buyer info update failed (columns may not exist):", e.message);
    }

    console.log("Card reserved:", card.id, card.code);
    return res.status(200).json({ claimed: true, card, message: "Card reserved for pickup" });

  } catch (err) {
    console.error("Claim error:", err);
    return res.status(500).json({ error: err.message });
  }
};
