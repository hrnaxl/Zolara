/**
 * Zolara create-gift-card — creates a digital gift card server-side (bypasses RLS)
 * Called after successful Paystack payment for email delivery
 */
const https = require("https");

const SB_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const TIER_VALUES = { Bronze: 1, Silver: 220, Gold: 450, Platinum: 650, Diamond: 1000 };
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function rand4() {
  let s = "";
  for (let i = 0; i < 4; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

function sbInsert(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      "apikey": SK, "Authorization": "Bearer " + SK,
      "Content-Type": "application/json", "Prefer": "return=representation",
      "Content-Length": Buffer.byteLength(data),
    };
    const req = https.request(
      { hostname: SB_HOST, port: 443, path: "/rest/v1/gift_cards", method: "POST", headers },
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
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, buyerName, buyerEmail, buyerPhone, recipientName, recipientEmail, message } = req.body || {};
  if (!tier) return res.status(400).json({ error: "Missing tier" });

  const amount = TIER_VALUES[tier] || 0;
  const pfx = tier.substring(0, 3).toUpperCase();
  const code = pfx + "-" + rand4() + "-" + rand4();
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  try {
    const r = await sbInsert({
      code,
      tier,
      amount,
      balance: amount,
      status: "active",
      payment_status: "paid",
      card_type: "digital",
      buyer_name: buyerName || null,
      buyer_email: buyerEmail || null,
      buyer_phone: buyerPhone || null,
      recipient_name: recipientName || buyerName || null,
      recipient_email: recipientEmail || buyerEmail || null,
      message: message || null,
      expires_at: expires.toISOString(),
    });

    console.log("Create card:", r.status, JSON.stringify(r.data));
    if (r.status >= 400) return res.status(500).json({ error: "Insert failed", detail: r.data });

    const card = Array.isArray(r.data) ? r.data[0] : r.data;
    return res.status(200).json({ ok: true, card });
  } catch (err) {
    console.error("create-gift-card error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
