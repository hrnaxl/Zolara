const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = {
  "apikey": SK,
  "Authorization": "Bearer " + SK,
  "Content-Type": "application/json",
  "Prefer": "return=minimal",
};

// Save only the columns we KNOW exist in the DB
const SAFE_COLS = [
  "business_name","logo_url","open_time","close_time","currency",
  "business_phone","business_email","business_address","payment_methods",
  "deposit_amount","loyalty_stamp_per_ghs","loyalty_stamps_for_reward",
  "loyalty_reward_discount","service_categories","staff_roles","staff_specialties",
  "closed_dates","gift_card_prices","landing_sections",
];

// Try-to-save columns added later via SQL
const EXTENDED_COLS = [
  "promo_banner","announcement","business_phone_2","whatsapp_number",
  "instagram_handle","tiktok_handle","facebook_handle","cancellation_policy",
  "lateness_fee","lateness_cutoff","student_discount","max_bookings_per_slot",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse body manually to bypass Vercel's 1MB body parser limit
    let payload = req.body;
    if (!payload || typeof payload !== "object") {
      // Try reading raw body
      const rawBody = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => { data += chunk; });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      try { payload = JSON.parse(rawBody); } catch(e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Get existing row id
    const findRes = await fetch(`${SB}/settings?select=id&limit=1`, { headers: H });
    if (!findRes.ok) {
      const t = await findRes.text();
      return res.status(500).json({ error: "DB read failed: " + t });
    }
    const rows = await findRes.json();
    const existingId = Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;

    // Build safe payload — only known columns
    const safePayload = {};
    for (const k of SAFE_COLS) {
      if (payload[k] !== undefined) safePayload[k] = payload[k];
    }

    const url = existingId
      ? `${SB}/settings?id=eq.${existingId}`
      : `${SB}/settings`;
    const method = existingId ? "PATCH" : "POST";

    // Save core columns first
    const r1 = await fetch(url, { method, headers: H, body: JSON.stringify(safePayload) });
    if (!r1.ok) {
      const e1 = await r1.text();
      return res.status(500).json({ error: "Core save failed: " + e1 });
    }

    // Save extended columns one at a time, skip if column doesn't exist
    if (existingId) {
      for (const k of EXTENDED_COLS) {
        if (payload[k] === undefined) continue;
        await fetch(`${SB}/settings?id=eq.${existingId}`, {
          method: "PATCH",
          headers: H,
          body: JSON.stringify({ [k]: payload[k] }),
        }).catch(() => {}); // silently skip unknown columns
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-settings:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
