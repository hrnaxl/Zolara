// Persistent rate limiter using amanda_rate_log table in Supabase
// Falls back to allowing request if DB check fails — never block on DB error
const SB_RL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const SK_RL = (process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY) || process.env.VITE_SUPABASE_SERVICE_KEY;
async function checkRateLimit(ip) {
  try {
    const windowStart = new Date(Date.now() - 60 * 1000).toISOString();
    const r = await fetch(
      `${SB_RL}/rest/v1/amanda_rate_log?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(windowStart)}&select=id`,
      { headers: { apikey: SK_RL, Authorization: 'Bearer ' + SK_RL } }
    );
    const rows = await r.json().catch(() => []);
    if (Array.isArray(rows) && rows.length >= 20) return false;
    // Log this request
    await fetch(`${SB_RL}/rest/v1/amanda_rate_log`, {
      method: 'POST',
      headers: { apikey: SK_RL, Authorization: 'Bearer ' + SK_RL, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ip }),
    }).catch(() => {});
    return true;
  } catch { return true; } // fail open — never block on DB error
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://zolarasalon.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // Rate limit check
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Server-side only — ANTHROPIC_API_KEY must NOT have VITE_ prefix
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
