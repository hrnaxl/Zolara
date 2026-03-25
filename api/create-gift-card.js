const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
    amount = overrideAmount || pt.amount;
    codePrefix = "PRM";
    promoLabel = pt.name;
    // Increment uses_count
    await fetch(`${SB}/promo_gift_card_types?id=eq.${promoTypeId}`, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ uses_count: (pt.uses_count || 0) + 1 }),
    });
  } else {
    amount = overrideAmount || TV[tier] || 0;
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
