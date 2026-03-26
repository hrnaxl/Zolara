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

// Fetch with proper URL encoding
async function sb(path) {
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: H });
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// ilike needs % encoded as %25 in the URL
async function sbIlike(table, col, partial, extra = "") {
  try {
    const encoded = encodeURIComponent(`%${partial}%`);
    const path = `${table}?${col}=ilike.${encoded}${extra ? "&" + extra : ""}`;
    const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: H });
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function sbPatch(path, body) {
  try {
    await fetch(SB_URL + "/rest/v1/" + path, {
      method: "PATCH",
      headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify(body),
    });
  } catch {}
}

async function sbPost(path, body) {
  try {
    const r = await fetch(SB_URL + "/rest/v1/" + path, {
      method: "POST", headers: H, body: JSON.stringify(body),
    });
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  } catch { return null; }
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
    const intl  = local.startsWith("0") ? "233" + local.slice(1) : local;
    const last9 = local.slice(-9);

    // 1. Validate session
    const sessions = await sb(`client_sessions?token=eq.${encodeURIComponent(token)}&limit=1`);
    if (!sessions.length) return res.status(401).json({ error: "Invalid session" });
    if (new Date(sessions[0].expires_at) < new Date()) return res.status(401).json({ error: "Session expired" });

    // 2. Fetch ALL bookings for this phone using ilike with proper encoding
    const allMyBookings = await sbIlike("bookings", "client_phone", last9, "order=preferred_date.desc&limit=100");

    // Also fetch by exact phone formats
    const exactBookings = await sb(`bookings?or=(client_phone.eq.${encodeURIComponent(local)},client_phone.eq.${encodeURIComponent(intl)})&order=preferred_date.desc&limit=100`);

    // Merge bookings
    const seenB = new Set();
    const mergedBookings = [...allMyBookings, ...exactBookings].filter(b => {
      if (seenB.has(b.id)) return false; seenB.add(b.id); return true;
    });

    // 3. Collect every client_id from those bookings
    const clientIds = [...new Set(mergedBookings.map(b => b.client_id).filter(Boolean))];

    // 4. Find all client records — by phone AND by every client_id in bookings
    const [exactClients, likeClients] = await Promise.all([
      sb(`clients?or=(phone.eq.${encodeURIComponent(local)},phone.eq.${encodeURIComponent(intl)})&limit=10`),
      sbIlike("clients", "phone", last9, "limit=10"),
    ]);
    const idClients = clientIds.length
      ? await sb(`clients?id=in.(${clientIds.join(",")})&limit=20`)
      : [];

    // Pick client with MOST loyalty_points — always the admin's real record
    const seenC = new Set();
    const allClients = [...exactClients, ...likeClients, ...idClients].filter(r => {
      if (!r?.id || seenC.has(r.id)) return false;
      seenC.add(r.id); return true;
    });
    let client = allClients.sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))[0] || null;

    // 5. No client at all — create one
    if (!client) {
      const nameRow = mergedBookings.find(b => b.client_name);
      const name = nameRow?.client_name || "Zolara Client";
      client = await sbPost("clients", { phone: local, name, loyalty_points: 0, total_visits: 0, total_spent: 0 });
    }

    if (!client?.id) return res.status(200).json({ client: null, bookings: [], giftCards: [] });

    // 6. Ensure phone is stored in local format
    if (client.phone !== local) {
      await sbPatch(`clients?id=eq.${client.id}`, { phone: local });
      client = { ...client, phone: local };
    }

    // 7. Backfill client_id on unlinked bookings
    const unlinked = mergedBookings.filter(b => !b.client_id);
    if (unlinked.length) {
      const ids = unlinked.map(b => b.id).join(",");
      await sbPatch(`bookings?id=in.(${ids})`, { client_id: client.id });
    }

    // 8. Sync total_visits and total_spent (NEVER touch loyalty_points)
    const completed = mergedBookings.filter(b => b.status === "completed");
    const totalVisits = completed.length;
    const totalSpent  = completed.reduce((s, b) => s + Number(b.price || 0), 0);
    if (totalVisits !== (client.total_visits || 0) || Math.round(totalSpent) !== Math.round(client.total_spent || 0)) {
      await sbPatch(`clients?id=eq.${client.id}`, { total_visits: totalVisits, total_spent: totalSpent });
      client = { ...client, total_visits: totalVisits, total_spent: totalSpent };
    }

    // 9. Final bookings — merge with client_id query
    const byClientId = await sb(`bookings?client_id=eq.${client.id}&order=preferred_date.desc&limit=50`);
    const seenBFinal = new Set();
    const bookings = [...mergedBookings, ...byClientId]
      .filter(b => { if (seenBFinal.has(b.id)) return false; seenBFinal.add(b.id); return true; })
      .sort((a, b) => (a.preferred_date > b.preferred_date ? -1 : 1));

    // 10. Gift cards
    const [gc1, gc2] = await Promise.all([
      sb(`gift_cards?buyer_phone=eq.${encodeURIComponent(local)}&order=created_at.desc`),
      sb(`gift_cards?buyer_phone=eq.${encodeURIComponent(intl)}&order=created_at.desc`),
    ]);
    const seenG = new Set();
    const giftCards = [...gc1, ...gc2].filter(g => {
      if (seenG.has(g.id)) return false; seenG.add(g.id); return true;
    });

    return res.status(200).json({ client, bookings, giftCards });

  } catch (e) {
    console.error("client-me:", e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
}
