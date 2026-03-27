const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const H = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Accept": "application/json" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const r = await fetch(`${SB_URL}/rest/v1/promo_gift_card_types?order=created_at.desc`, { headers: H });
    const data = await r.json();
    if (!r.ok) return res.status(200).json([]); // fail silently — show no promos
    const now = new Date();
    const active = (Array.isArray(data) ? data : []).filter(p => {
      if (p.is_active === false) return false; // respect explicit false
      if (p.expires_at && new Date(p.expires_at) < now) return false;
      if (p.max_uses && p.uses_count >= p.max_uses) return false;
      return true;
    });
    return res.status(200).json(active);
  } catch {
    return res.status(200).json([]);
  }
}
