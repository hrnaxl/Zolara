const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SB_SERVICE_KEY,
    "Authorization": "Bearer " + SB_SERVICE_KEY,
    "Prefer": "return=representation",
  };
}

function toLocal(raw) {
  const d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("233") && d.length >= 12) return "0" + d.slice(3);
  if (d.startsWith("0") && d.length === 10) return d;
  if (d.length === 9) return "0" + d;
  return d;
}

function genToken() {
  const arr = new Uint8Array(32);
  for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

    const normalized = toLocal(phone);

    // Fetch matching OTP
    const otpRes = await fetch(
      `${SB_URL}/rest/v1/client_otp_codes?phone=eq.${normalized}&code=eq.${code}&used=eq.false&order=created_at.desc&limit=1`,
      { headers: sbHeaders() }
    );
    const otps = await otpRes.json();

    if (!otps || otps.length === 0) {
      return res.status(401).json({ error: "Invalid code. Please try again." });
    }

    const otp = otps[0];
    if (new Date(otp.expires_at) < new Date()) {
      return res.status(401).json({ error: "Code has expired. Request a new one." });
    }

    // Mark OTP as used
    await fetch(`${SB_URL}/rest/v1/client_otp_codes?id=eq.${otp.id}`, {
      method: "PATCH",
      headers: sbHeaders(),
      body: JSON.stringify({ used: true }),
    });

    // Create or update session token
    const token = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // Delete old sessions for this phone
    await fetch(`${SB_URL}/rest/v1/client_sessions?phone=eq.${normalized}`, {
      method: "DELETE",
      headers: sbHeaders(),
    });

    // Insert new session
    await fetch(`${SB_URL}/rest/v1/client_sessions`, {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({ phone: normalized, token, expires_at: expiresAt }),
    });

    // Find or create client record
    const clientRes = await fetch(
      `${SB_URL}/rest/v1/clients?phone=eq.${normalized}&limit=1`,
      { headers: sbHeaders() }
    );
    const clients = await clientRes.json();

    let client = clients?.[0] || null;

    // Also try matching with leading 0 format
    if (!client) {
      const localPhone = normalized; // already local format
      const r2 = await fetch(
        `${SB_URL}/rest/v1/clients?phone=eq.${encodeURIComponent(localPhone)}&limit=1`,
        { headers: sbHeaders() }
      );
      const c2 = await r2.json();
      client = c2?.[0] || null;
    }

    return res.status(200).json({ ok: true, token, client: client || null });
  } catch (e) {
    console.error("client-verify-otp:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
