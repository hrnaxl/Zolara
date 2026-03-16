const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=representation" };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { cardId, appliedAmount, currentBalance, clientName } = req.body || {};
  if (!cardId) return res.status(400).json({ error: "Missing cardId" });
  try {
    const gr = await fetch(SB + "/gift_cards?id=eq." + cardId + "&select=*&limit=1", { headers: H });
    const gd = await gr.json();
    if (!Array.isArray(gd) || gd.length === 0) return res.status(404).json({ error: "Card not found" });
    const card = gd[0];
    if (card.tier !== "Diamond" && card.status === "redeemed") return res.status(409).json({ error: "Already redeemed", alreadyUsed: true });
    if (card.tier === "Diamond" && (Number(card.balance||0) <= 0 || (card.redemption_count||0) >= 3)) return res.status(409).json({ error: "Diamond card fully used", alreadyUsed: true });
    const applied = Number(appliedAmount || 0);
    const bal = Number(currentBalance != null ? currentBalance : card.balance || 0);
    const newBal = Math.max(0, bal - applied);
    const newCount = (card.redemption_count || 0) + 1;
    const diamond = card.tier === "Diamond";
    const done = !diamond || newBal <= 0 || newCount >= 3;
    const pr = await fetch(SB + "/gift_cards?id=eq." + cardId, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ status: done ? "redeemed" : "active", balance: newBal, redemption_count: newCount, redeemed_by_client: clientName || null, redeemed_at: new Date().toISOString() }),
    });
    const pd = await pr.json();
    console.log("Redeem:", pr.status, JSON.stringify(pd));
    if (!pr.ok) return res.status(500).json({ error: "Update failed", detail: pd });
    return res.status(200).json({ ok: true, newBalance: newBal, fullyUsed: done, newStatus: done ? "redeemed" : "active" });
  } catch (err) {
    console.error("redeem error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
