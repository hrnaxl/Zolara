const SB_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const r = await fetch(`${SB_URL}/rest/v1/promo_gift_card_types?is_active=eq.true&order=created_at.desc`, { headers: H });
    const data = await r.json();
    if (!r.ok) return res.status(200).json([]); // fail silently — show no promos
    const now = new Date();
    const active = (Array.isArray(data) ? data : []).filter(p => {
      if (p.expires_at && new Date(p.expires_at) < now) return false;
      if (p.max_uses && p.uses_count >= p.max_uses) return false;
      return true;
    });
    return res.status(200).json(active);
  } catch {
    return res.status(200).json([]);
  }
}
