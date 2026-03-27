const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const H = { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Prefer": "return=representation" };

function toLocal(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.startsWith("233") && d.length >= 12) return "0" + d.slice(3);
  if (d.startsWith("0") && d.length === 10) return d;
  if (d.length === 9) return "0" + d;
  return d;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { token, phone, updates } = req.body || {};
    if (!token || !phone) return res.status(400).json({ error: "token and phone required" });

    // Validate session
    const sessions = await fetch(`${SB_URL}/rest/v1/client_sessions?token=eq.${token}&limit=1`, { headers: H }).then(r => r.json());
    if (!sessions?.length) return res.status(401).json({ error: "Invalid session" });
    if (new Date(sessions[0].expires_at) < new Date()) return res.status(401).json({ error: "Session expired" });

    const local = toLocal(phone);
    const intl = local.startsWith("0") ? "233" + local.slice(1) : local;

    // Find client
    const clients = await fetch(`${SB_URL}/rest/v1/clients?or=(phone.eq.${local},phone.eq.${intl})&limit=1`, { headers: H }).then(r => r.json());
    if (!clients?.length) return res.status(404).json({ error: "Client not found" });
    const client = clients[0];

    // Update
    const allowed = {};
    if (updates.name) allowed.name = updates.name;
    if (updates.email !== undefined) allowed.email = updates.email;
    if (updates.birthday !== undefined) allowed.birthday = updates.birthday;
    allowed.updated_at = new Date().toISOString();

    const updated = await fetch(`${SB_URL}/rest/v1/clients?id=eq.${client.id}`, {
      method: "PATCH", headers: H, body: JSON.stringify(allowed),
    }).then(r => r.json());

    const newClient = Array.isArray(updated) ? updated[0] : { ...client, ...allowed };
    return res.status(200).json({ ok: true, client: newClient });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
