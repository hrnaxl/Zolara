/**
 * Zolara activate-gift-card — marks a digital card as active after payment confirmed
 */
const https = require("https");

const SB_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

function sbPatch(id, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      "apikey": SK, "Authorization": "Bearer " + SK,
      "Content-Type": "application/json", "Prefer": "return=representation",
      "Content-Length": Buffer.byteLength(data),
    };
    const req = https.request(
      { hostname: SB_HOST, port: 443, path: "/rest/v1/gift_cards?id=eq." + id, method: "PATCH", headers },
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

  const { giftCardId, paymentRef } = req.body || {};
  if (!giftCardId) return res.status(400).json({ error: "Missing giftCardId" });

  try {
    const r = await sbPatch(giftCardId, {
      status: "active",
      payment_status: "paid",
      payment_ref: paymentRef || null,
    });
    console.log("Activate:", r.status, JSON.stringify(r.data));
    if (r.status >= 400) return res.status(500).json({ error: "Update failed", detail: r.data });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("activate-gift-card error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
