const SB = "https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1";
const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const H = {
  "apikey": SK,
  "Authorization": "Bearer " + SK,
  "Content-Type": "application/json",
  "Prefer": "return=minimal",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Get existing row id
    const findRes = await fetch(`${SB}/settings?select=id&limit=1`, { headers: H });
    const rows = await findRes.json();
    const existingId = Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;

    if (existingId) {
      const r = await fetch(`${SB}/settings?id=eq.${existingId}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const errText = await r.text();
        // Unknown column — strip new cols and retry
        const NEW_COLS = ["promo_banner","announcement","business_phone_2","whatsapp_number",
          "instagram_handle","tiktok_handle","facebook_handle","cancellation_policy",
          "lateness_fee","lateness_cutoff","student_discount","max_bookings_per_slot"];
        const safePayload = { ...payload };
        NEW_COLS.forEach(k => delete safePayload[k]);
        const r2 = await fetch(`${SB}/settings?id=eq.${existingId}`, {
          method: "PATCH", headers: H, body: JSON.stringify(safePayload),
        });
        if (!r2.ok) {
          const e2 = await r2.text();
          return res.status(500).json({ error: "Save failed: " + e2 });
        }
        // Try new cols silently
        fetch(`${SB}/settings?id=eq.${existingId}`, {
          method: "PATCH", headers: H,
          body: JSON.stringify(Object.fromEntries(NEW_COLS.filter(k => payload[k] !== undefined).map(k => [k, payload[k]]))),
        }).catch(() => {});
      }
    } else {
      const r = await fetch(`${SB}/settings`, {
        method: "POST", headers: H, body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const errText = await r.text();
        return res.status(500).json({ error: "Insert failed: " + errText });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-settings error:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
