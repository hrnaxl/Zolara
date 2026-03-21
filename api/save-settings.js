const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H  = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json", Prefer: "return=minimal" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
