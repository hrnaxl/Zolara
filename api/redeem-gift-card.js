const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

async function sbFetch(path, method = "GET", body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", "Prefer": method === "PATCH" ? "return=representation" : "" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { data: JSON.parse(text), ok: res.ok, status: res.status }; }
  catch { return { data: text, ok: res.ok, status: res.status }; }
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
    const get = await sbFetch(`gift_cards?id=eq.${cardId}&select=*`);
    const card = Array.isArray(get.data) ? get.data[0] : null;
    if (!card) return res.status(404).json({ error: "Card not found" });
    const applied = Number(appliedAmount || 0);
    const balance = Number(currentBalance ?? card.balance ?? 0);
    const newBalance = Math.max(0, balance - applied);
    const redemptionCount = (card.redemption_count || 0) + 1;
    const diamond = isDiamond || card.tier === "Diamond";
    const fullyUsed = !diamond || newBalance <= 0 || redemptionCount >= 3;
    const update = { status: fullyUsed ? "redeemed" : "active", balance: newBalance, redeemed_by_client: clientName || null };
    if (fullyUsed) update.redeemed_at = new Date().toISOString();
    if ("redemption_count" in card) update.redemption_count = redemptionCount;
    const patch = await sbFetch(`gift_cards?id=eq.${cardId}`, "PATCH", update);
    return res.status(200).json({ ok: patch.ok, newBalance, redemptionCount, fullyUsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
