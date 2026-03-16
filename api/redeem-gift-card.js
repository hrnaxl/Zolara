const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  const t = await r.text();
  try { return { data: JSON.parse(t), ok: r.ok, status: r.status }; }
  catch { return { data: t, ok: r.ok, status: r.status }; }
}

async function sbPatch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  try { return { data: JSON.parse(t), ok: r.ok, status: r.status }; }
  catch { return { data: t, ok: r.ok, status: r.status }; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { cardId, appliedAmount, isDiamond, currentBalance, clientName } = req.body;
  if (!cardId) return res.status(400).json({ error: "Missing cardId" });

  try {
    // 1. Fetch current card state with service role
    const get = await sbGet(`gift_cards?id=eq.${cardId}&select=*`);
    const card = Array.isArray(get.data) ? get.data[0] : null;
    if (!card) return res.status(404).json({ error: "Card not found" });

    // 2. CRITICAL: Re-validate card is still redeemable — prevents double redemption
    if (card.tier !== "Diamond") {
      if (card.status === "redeemed") {
        return res.status(409).json({ error: "Card already redeemed", alreadyUsed: true });
      }
    } else {
      // Diamond: check balance and count
      if (Number(card.balance || 0) <= 0 || (card.redemption_count || 0) >= 3) {
        return res.status(409).json({ error: "Diamond card has no remaining balance or uses", alreadyUsed: true });
      }
    }

    // 3. Calculate new state
    const applied = Number(appliedAmount || 0);
    const balance = Number(currentBalance ?? card.balance ?? 0);
    const newBalance = Math.max(0, balance - applied);
    const redemptionCount = (card.redemption_count || 0) + 1;
    const diamond = card.tier === "Diamond";
    const fullyUsed = !diamond || newBalance <= 0 || redemptionCount >= 3;

    // 4. Build update — always include redemption_count even if column is null
    const update = {
      status: fullyUsed ? "redeemed" : "active",
      balance: newBalance,
      redeemed_by_client: clientName || null,
      redemption_count: redemptionCount,
    };
    if (fullyUsed) update.redeemed_at = new Date().toISOString();

    // 5. PATCH and verify at least 1 row was updated
    const patch = await sbPatch(`gift_cards?id=eq.${cardId}`, update);
    const updated = Array.isArray(patch.data) ? patch.data : [];

    if (!patch.ok || updated.length === 0) {
      console.error("PATCH failed or updated 0 rows:", patch.status, JSON.stringify(patch.data));
      return res.status(500).json({ error: "Failed to update card — 0 rows matched", detail: patch.data });
    }

    console.log("Card marked redeemed:", cardId, "newBalance:", newBalance, "fullyUsed:", fullyUsed);
    return res.status(200).json({ ok: true, newBalance, redemptionCount, fullyUsed, card: updated[0] });
  } catch (err) {
    console.error("Redeem error:", err);
    return res.status(500).json({ error: err.message });
  }
};
