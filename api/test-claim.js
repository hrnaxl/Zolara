const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const tier = (req.query && req.query.tier) || "Bronze";
  const url = SUPABASE_URL + "/rest/v1/gift_cards?tier=eq." + encodeURIComponent(tier) +
    "&card_type=eq.physical&payment_status=eq.pending&status=eq.active&select=id,code,tier,card_type,payment_status,status,amount";
  const r = await fetch(url, { headers: H });
  const d = await r.json();
  return res.status(200).json({ tier, status: r.status, found: Array.isArray(d) ? d.length : 0, cards: d });
};
