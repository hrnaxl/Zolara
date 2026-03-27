const SB = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) + "/rest/v1";
const SK = (process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY);
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" };
const TV = { Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };
function toLocal(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.startsWith("233") && d.length >= 12) return "0" + d.slice(3);
  if (d.startsWith("0") && d.length === 10) return d;
  if (d.length === 9) return "0" + d;
  return d;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://zolarasalon.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, promoTypeId, buyerName, buyerEmail, paymentRef, amount } = req.body || {};
  const buyerPhone = toLocal(req.body?.buyerPhone || "");
  const note = `RESERVED. Buyer: ${buyerName||""} | ${buyerPhone||""} | Ref: ${paymentRef||""} | ${new Date().toISOString()}`;

  try {
    let findUrl, card;

    if (promoTypeId) {
      // ── PROMO CARD: find an available pre-generated promo card from this type ──
      findUrl = `${SB}/gift_cards?promo_type_id=eq.${promoTypeId}&card_type=eq.physical&payment_status=eq.pending&status=eq.active&limit=1&order=created_at.asc&select=id,code,serial_number,tier,amount,balance,promo_type_id`;
      const findRes = await fetch(findUrl, { headers: H });
      const found = await findRes.json();

      if (Array.isArray(found) && found.length > 0) {
        card = found[0];
        await fetch(`${SB}/gift_cards?id=eq.${card.id}`, {
          method: "PATCH", headers: H,
          body: JSON.stringify({ payment_status: "pending_pickup", buyer_name: buyerName||null, buyer_email: buyerEmail||null, buyer_phone: buyerPhone||null, notes: note }),
        });
        return res.status(200).json({ claimed: true, card: { ...card, payment_status: "pending_pickup" } });
      }

      // No pre-generated cards in stock — create a placeholder
      const ptRes = await fetch(`${SB}/promo_gift_card_types?id=eq.${promoTypeId}&select=name,amount`, { headers: H });
      const ptData = await ptRes.json();
      const pt = Array.isArray(ptData) ? ptData[0] : null;
      const amount = pt?.amount || 0;
      const expires = new Date(); expires.setFullYear(expires.getFullYear() + 1);
      const ins = await fetch(`${SB}/gift_cards`, {
        method: "POST", headers: H,
        body: JSON.stringify({ code: "PROMO-" + Date.now().toString(36).toUpperCase(), tier: "Gold", amount, balance: amount, status: "active", payment_status: "pending_pickup", card_type: "physical", promo_type_id: promoTypeId, buyer_name: buyerName||null, buyer_email: buyerEmail||null, buyer_phone: buyerPhone||null, notes: "NO STOCK. " + note, expires_at: expires.toISOString() }),
      });
      const inserted = await ins.json();
      return res.status(200).json({ claimed: false, card: Array.isArray(inserted) ? inserted[0] : inserted, message: "No promo stock. Placeholder created — assign card manually." });

    } else {
      // ── STANDARD TIER: find pre-printed card ──
      if (!tier) return res.status(400).json({ error: "Missing tier" });
      // Match by tier AND exact amount paid — cards are pre-printed at the current price
      const paidAmount = Number(amount) || TV[tier] || 0;
      findUrl = `${SB}/gift_cards?tier=eq.${encodeURIComponent(tier)}&card_type=eq.physical&payment_status=eq.pending&status=eq.active&promo_type_id=is.null&amount=eq.${paidAmount}&order=created_at.asc&limit=1&select=id,code,serial_number,tier,amount,balance`;
      const findRes = await fetch(findUrl, { headers: H });
      const found = await findRes.json();

      if (Array.isArray(found) && found.length > 0) {
        card = found[0];
        await fetch(`${SB}/gift_cards?id=eq.${card.id}`, {
          method: "PATCH", headers: H,
          body: JSON.stringify({ payment_status: "pending_pickup", buyer_name: buyerName||null, buyer_email: buyerEmail||null, buyer_phone: buyerPhone||null, notes: note }),
        });
        return res.status(200).json({ claimed: true, card: { ...card, payment_status: "pending_pickup" } });
      }

      // No stock — create placeholder
      const placeholderAmount = paidAmount || TV[tier] || 0;
      const expires = new Date(); expires.setFullYear(expires.getFullYear() + 1);
      const ins = await fetch(`${SB}/gift_cards`, {
        method: "POST", headers: H,
        body: JSON.stringify({ code: "PICKUP-" + Date.now().toString(36).toUpperCase(), tier, amount: placeholderAmount, balance: placeholderAmount, status: "active", payment_status: "pending_pickup", card_type: "physical", buyer_name: buyerName||null, buyer_email: buyerEmail||null, buyer_phone: buyerPhone||null, notes: "NO STOCK. Assign manually. " + note, expires_at: expires.toISOString() }),
      });
      const inserted = await ins.json();
      return res.status(200).json({ claimed: false, card: Array.isArray(inserted) ? inserted[0] : inserted, message: "No stock. Placeholder created." });
    }
  } catch (err) {
    console.error("claim error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
