// Returns client profile + bookings + gift cards using service role (bypasses RLS)
const SB_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

const H = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": "Bearer " + SB_KEY,
  "Prefer": "return=representation",
};

function toLocal(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.startsWith("233") && d.length >= 12) return "0" + d.slice(3);
  if (d.startsWith("0") && d.length === 10) return d;
  return d;
}

async function sb(path) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: H });
  return r.json();
}

async function sbPost(path, body) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    method: "POST", headers: H, body: JSON.stringify(body),
  });
  return r.json();
}

async function sbPatch(path, body) {
  await fetch(SB_URL + "/rest/v1/" + path, {
    method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
    body: JSON.stringify(body),
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { token, phone } = req.body || {};
    if (!token || !phone) return res.status(400).json({ error: "token and phone required" });

    // Validate session token
    const local = toLocal(phone);
    const intl = local.startsWith("0") ? "233" + local.slice(1) : local;

    const sessions = await sb(`client_sessions?token=eq.${token}&limit=1`);
    if (!sessions || sessions.length === 0) return res.status(401).json({ error: "Invalid session" });
    const session = sessions[0];
    if (new Date(session.expires_at) < new Date()) return res.status(401).json({ error: "Session expired" });

    // Find client record by phone (both formats)
    let clients = await sb(`clients?or=(phone.eq.${local},phone.eq.${intl})&limit=1`);
    let client = clients?.[0] || null;

    // No client record — look up name from bookings and create one
    if (!client) {
      const bookings = await sb(`bookings?or=(client_phone.eq.${local},client_phone.eq.${intl})&select=client_name&limit=1`);
      const name = bookings?.[0]?.client_name || "Zolara Client";
      const newClient = await sbPost("clients", { phone: local, name, loyalty_points: 0, total_visits: 0, total_spent: 0 });
      client = Array.isArray(newClient) ? newClient[0] : newClient;
    }

    if (!client) return res.status(200).json({ client: null, bookings: [], giftCards: [] });

    // Backfill client_id on bookings missing it
    await sbPatch(
      `bookings?or=(client_phone.eq.${local},client_phone.eq.${intl})&client_id=is.null`,
      { client_id: client.id }
    );

    // Fetch bookings (by client_id OR phone)
    const [byId, byPhone] = await Promise.all([
      sb(`bookings?client_id=eq.${client.id}&order=preferred_date.desc&limit=50`),
      sb(`bookings?or=(client_phone.eq.${local},client_phone.eq.${intl})&order=preferred_date.desc&limit=50`),
    ]);
    const allBookings = [...(byId || []), ...(byPhone || [])];
    const seenB = new Set();
    const bookings = allBookings.filter(b => { if (seenB.has(b.id)) return false; seenB.add(b.id); return true; });

    // Fetch gift cards
    const giftCards = await sb(`gift_cards?or=(client_id.eq.${client.id},buyer_phone.eq.${local},buyer_phone.eq.${intl})&order=created_at.desc`);

    return res.status(200).json({
      client,
      bookings,
      giftCards: giftCards || [],
    });
  } catch (e) {
    console.error("client-me:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
