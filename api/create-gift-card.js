import { webcrypto } from "crypto";
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
const C = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const r4 = () => Array.from({length:4}, () => C[Math.floor(Math.random()*C.length)]).join("");

function generateCode(tier) {
  const prefix = (tier || "GFT").substring(0, 3).toUpperCase();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(8);
  webcrypto.getRandomValues(arr);
  const part1 = Array.from(arr.slice(0,4)).map(b => chars[b % chars.length]).join("");
  const part2 = Array.from(arr.slice(4,8)).map(b => chars[b % chars.length]).join("");
  return `${prefix}-${part1}-${part2}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://zolarasalon.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, promoTypeId, promoName, amount: overrideAmount, buyerName, buyerEmail, recipientName, recipientEmail, message } = req.body || {};
  const buyerPhone = toLocal(req.body?.buyerPhone || "");
  if (!tier && !promoTypeId) return res.status(400).json({ error: "Missing tier or promoTypeId" });

  let amount, codePrefix, promoLabel = null;

  if (promoTypeId) {
    // Promotional gift card — fetch from promo_gift_card_types
    const ptRes = await fetch(`${SB}/promo_gift_card_types?id=eq.${promoTypeId}&select=*`, { headers: H });
    const ptData = await ptRes.json();
    const pt = Array.isArray(ptData) ? ptData[0] : null;
    if (!pt) return res.status(400).json({ error: "Promo gift card type not found" });
    // Never trust client-submitted amount for promo cards — always use the DB value
    amount = pt.amount;
    codePrefix = "PRM";
    promoLabel = pt.name;
    // Increment uses_count
    await fetch(`${SB}/promo_gift_card_types?id=eq.${promoTypeId}`, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ uses_count: (pt.uses_count || 0) + 1 }),
    });
  } else {
    // Validate amount matches the tier — never trust client-submitted amount
    const expectedAmount = TV[tier] || 0;
    if (!expectedAmount) return res.status(400).json({ error: "Invalid tier" });
    // Allow a small tolerance (e.g. settings-based price) but never let client set arbitrary amount
    amount = expectedAmount;
    codePrefix = tier.substring(0, 3).toUpperCase();
  }

  const code = codePrefix + "-" + r4() + "-" + r4();
  const expires = new Date(); expires.setFullYear(expires.getFullYear() + 1);

  try {
    const payload = {
      code, tier: tier || "Gold", amount, balance: amount,
      status: "active", payment_status: "paid",
      card_type: "digital",
      buyer_name: buyerName || null, buyer_email: buyerEmail || null, buyer_phone: buyerPhone || null,
      recipient_name: recipientName || buyerName || null,
      recipient_email: recipientEmail || buyerEmail || null,
      message: message || null,
      expires_at: expires.toISOString(),
      promo_type_id: promoTypeId || null,
      // Store promo name in description/notes for display
      ...(promoLabel ? { description: promoLabel } : {}),
    };
    const r = await fetch(SB + "/gift_cards", {
      method: "POST", headers: H, body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: "Insert failed", detail: d });
    return res.status(200).json({ ok: true, card: Array.isArray(d) ? d[0] : d });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
