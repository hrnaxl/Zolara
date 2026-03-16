const https = require("https");

const SUPABASE_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

function sbRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json", "Prefer": "return=representation",
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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { cardId, appliedAmount, isDiamond, currentBalance, clientName } = req.body || {};
  if (!cardId) return res.status(400).json({ error: "Missing cardId" });

  try {
    const get = await sbRequest("GET", "gift_cards?id=eq." + cardId + "&select=*");
    const card = Array.isArray(get.data) ? get.data[0] : null;
    if (!card) return res.status(404).json({ error: "Card not found" });

    if (card.tier !== "Diamond") {
      if (card.status === "redeemed") return res.status(409).json({ error: "Card already redeemed", alreadyUsed: true });
    } else {
      if (Number(card.balance || 0) <= 0 || (card.redemption_count || 0) >= 3)
        return res.status(409).json({ error: "Diamond card fully used", alreadyUsed: true });
    }

    const applied = Number(appliedAmount || 0);
    const balance = Number(currentBalance ?? card.balance ?? 0);
    const newBalance = Math.max(0, balance - applied);
    const fullyUsed = card.tier !== "Diamond" || newBalance <= 0;
    const newStatus = fullyUsed ? "redeemed" : "active";

    const updateBody = { status: newStatus, balance: newBalance };
    if (card.redeemed_by_client !== undefined) updateBody.redeemed_by_client = clientName || null;
    if (card.redeemed_at !== undefined && fullyUsed) updateBody.redeemed_at = new Date().toISOString();
    if (card.redemption_count !== undefined) updateBody.redemption_count = (card.redemption_count || 0) + 1;

    const patch = await sbRequest("PATCH", "gift_cards?id=eq." + cardId, updateBody);
    const updated = Array.isArray(patch.data) ? patch.data : [];

    if (patch.status >= 400 || updated.length === 0) {
      // Fallback — minimal update
      const min = await sbRequest("PATCH", "gift_cards?id=eq." + cardId, { status: newStatus, balance: newBalance });
      if (min.status >= 400) return res.status(500).json({ error: "Failed to update card", detail: min.data });
    }

    console.log("Card redeemed:", cardId, "->", newStatus, "balance:", newBalance);
    return res.status(200).json({ ok: true, newBalance, fullyUsed, newStatus });
  } catch (err) {
    console.error("Redeem error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
