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
  if (d.length === 9) return "0" + d;
  return d;
}

async function sb(path) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: H });
  const data = await r.json();
  return Array.isArray(data) ? data : [];
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
  }).catch(() => {});
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

    const local = toLocal(phone);
    const intl = local.startsWith("0") ? "233" + local.slice(1) : local;
    const last9 = local.slice(-9);

    // 1. Validate session
    const sessions = await sb(`client_sessions?token=eq.${token}&limit=1`);
    if (!sessions.length) return res.status(401).json({ error: "Invalid session" });
    if (new Date(sessions[0].expires_at) < new Date()) return res.status(401).json({ error: "Session expired" });

    // 2. Find client — by phone (exact + ilike) then via bookings
    const [exactClients, likeClients] = await Promise.all([
      sb(`clients?or=(phone.eq.${local},phone.eq.${intl})&limit=10`),
      sb(`clients?phone=ilike.%${last9}%&limit=10`),
    ]);

    const linkedBookings = await sb(`bookings?client_phone=ilike.%${last9}%&client_id=not.is.null&select=client_id&limit=1`);
    const linkedId = linkedBookings[0]?.client_id || null;
    const linkedClients = linkedId ? await sb(`clients?id=eq.${linkedId}&limit=1`) : [];

    const seenIds = new Set();
    const allClients = [...exactClients, ...likeClients, ...linkedClients].filter(r => {
      if (!r?.id || seenIds.has(r.id)) return false;
      seenIds.add(r.id); return true;
    });

    let client = allClients.sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))[0] || null;

    // 3. No client record at all — create one from booking name
    if (!client) {
      const nameBookings = await sb(`bookings?client_phone=ilike.%${last9}%&select=client_name&limit=1`);
      const name = nameBookings[0]?.client_name || "Zolara Client";
      const created = await sbPost("clients", { phone: local, name, loyalty_points: 0, total_visits: 0, total_spent: 0 });
      client = Array.isArray(created) ? created[0] : created;
    }

    if (!client?.id) return res.status(200).json({ client: null, bookings: [], giftCards: [] });

    // 4. Backfill client_id on matching bookings
    await sbPatch(`bookings?client_phone=ilike.%${last9}%&client_id=is.null`, { client_id: client.id });

    // 5. Sync visit count (never overwrite loyalty_points — managed by checkout)
    const completed = await sb(`bookings?client_phone=ilike.%${last9}%&status=eq.completed&select=id,price`);
    const totalVisits = completed.length;
    const totalSpent = completed.reduce((s, b) => s + Number(b.price || 0), 0);
    if (totalVisits !== (client.total_visits || 0)) {
      await sbPatch(`clients?id=eq.${client.id}`, { total_visits: totalVisits, total_spent: totalSpent });
      client = { ...client, total_visits: totalVisits, total_spent: totalSpent };
    }

    // 6. Fetch all bookings
    const [byId, byExact, byLike] = await Promise.all([
      sb(`bookings?client_id=eq.${client.id}&order=preferred_date.desc&limit=50`),
      sb(`bookings?or=(client_phone.eq.${local},client_phone.eq.${intl})&order=preferred_date.desc&limit=50`),
      sb(`bookings?client_phone=ilike.%${last9}%&order=preferred_date.desc&limit=50`),
    ]);
    const seenB = new Set();
    const bookings = [...byId, ...byExact, ...byLike].filter(b => {
      if (seenB.has(b.id)) return false; seenB.add(b.id); return true;
    });

    // 7. Fetch gift cards
    const [gc1, gc2] = await Promise.all([
      sb(`gift_cards?buyer_phone=eq.${local}&order=created_at.desc`),
      sb(`gift_cards?buyer_phone=eq.${intl}&order=created_at.desc`),
    ]);
    const seenG = new Set();
    const giftCards = [...gc1, ...gc2].filter(g => {
      if (seenG.has(g.id)) return false; seenG.add(g.id); return true;
    });

    return res.status(200).json({ client, bookings, giftCards });

  } catch (e) {
    console.error("client-me error:", e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
