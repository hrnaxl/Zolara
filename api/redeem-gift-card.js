/**
 * Zolara redeem-gift-card — marks card as redeemed at checkout (service-role, bypasses RLS)
 * Non-Diamond: one use, status → redeemed
 * Diamond: up to 3 uses, balance deducted, status → redeemed only when balance=0 or uses=3
 */
const https = require("https");

const SB_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

function sbReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      "apikey": SK, "Authorization": "Bearer " + SK,
      "Content-Type": "application/json", "Prefer": "return=representation",
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

  const { cardId, appliedAmount, isDiamond, currentBalance, clientName } = req.body || {};
  if (!cardId) return res.status(400).json({ error: "Missing cardId" });

  try {
    // Fetch current card state
    const get = await sbReq("GET", "gift_cards?id=eq." + cardId + "&select=*&limit=1", null);
    if (get.status !== 200 || !Array.isArray(get.data) || get.data.length === 0) {
      return res.status(404).json({ error: "Card not found" });
    }
    const card = get.data[0];

    // Re-validate to prevent double redemption
    if (card.tier !== "Diamond") {
      if (card.status === "redeemed") {
        return res.status(409).json({ error: "Card already redeemed", alreadyUsed: true });
      }
    } else {
      const redemptions = card.redemption_count || 0;
      const balance = Number(card.balance || 0);
      if (balance <= 0 || redemptions >= 3) {
        return res.status(409).json({ error: "Diamond card fully used", alreadyUsed: true });
      }
    }

    // Calculate new state
    const applied = Number(appliedAmount || 0);
    const balance = Number(currentBalance != null ? currentBalance : card.balance || 0);
    const newBalance = Math.max(0, balance - applied);
    const diamond = card.tier === "Diamond";
    const newCount = (card.redemption_count || 0) + 1;
    const fullyUsed = !diamond || newBalance <= 0 || newCount >= 3;
    const newStatus = fullyUsed ? "redeemed" : "active";

    // Update card
    const patch = await sbReq("PATCH", "gift_cards?id=eq." + cardId, {
      status: newStatus,
      balance: newBalance,
      redemption_count: newCount,
      redeemed_by_client: clientName || null,
      redeemed_at: new Date().toISOString(),
    });
    console.log("Redeem:", patch.status, JSON.stringify(patch.data));

    if (patch.status >= 400) {
      return res.status(500).json({ error: "Failed to update card", detail: patch.data });
    }

    return res.status(200).json({ ok: true, newBalance, fullyUsed, newStatus });

  } catch (err) {
    console.error("redeem-gift-card error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
