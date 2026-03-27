const SB = process.env.SUPABASE_URL + "/rest/v1";
const SK = process.env.SUPABASE_SERVICE_KEY;
const H  = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json", Prefer: "return=minimal" };

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
const allowed = [process.env.ALLOWED_ORIGIN || "https://zolarasalon.com", "http://localhost:8080", "http://localhost:5173"];
res.setHeader("Access-Control-Allow-Origin", allowed.includes(origin) ? origin : allowed[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Require admin auth — validate token against Supabase auth
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  // Verify token is a real Supabase JWT by checking it with Supabase auth
  const SB_URL_CHECK = process.env.SUPABASE_URL;
  const SB_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  try {
    const userRes = await fetch(`${SB_URL_CHECK}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SB_ANON }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' });
    const userData = await userRes.json();
    // Only allow owner/admin roles — check app_metadata
    const role = userData?.app_metadata?.role || userData?.user_metadata?.role || '';
    if (!['owner', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") return res.status(400).json({ error: "Invalid body" });

    // Remove any base64 data from logo_url
    if (payload.logo_url && payload.logo_url.startsWith("data:")) delete payload.logo_url;

    // Get existing row id
    const r0 = await fetch(`${SB}/settings?select=id&limit=1`, { headers: H });
    const rows = await r0.json();
    const id = Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;

    let r;
    if (id) {
      r = await fetch(`${SB}/settings?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify(payload) });
    } else {
      r = await fetch(`${SB}/settings`, { method: "POST", headers: H, body: JSON.stringify(payload) });
    }

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).json({ error: txt });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
