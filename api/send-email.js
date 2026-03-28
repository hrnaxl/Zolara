const RESEND_KEY = process.env.RESEND_KEY;

// Simple IP-based rate limiting — max 10 emails per IP per hour
const emailRateMap = new Map();
function checkEmailRate(ip) {
  const now = Date.now();
  const entry = emailRateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60 * 60 * 1000) { emailRateMap.set(ip, { count: 1, start: now }); return true; }
  if (entry.count >= 10) return false;
  entry.count++;
  emailRateMap.set(ip, entry);
  return true;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://zolarasalon.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkEmailRate(ip)) return res.status(429).json({ error: "Too many requests" });
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).json({ error: "Missing to/subject/html" });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + RESEND_KEY },
      body: JSON.stringify({ from: "Zolara Beauty Studio <noreply@noreply.zolarasalon.com>", to: Array.isArray(to) ? to : [to], subject, html }),
    });
    const d = await r.json();
    console.log("Resend:", r.status, JSON.stringify(d));
    if (!r.ok) return res.status(500).json({ error: d.message || d.name || JSON.stringify(d) });
    return res.status(200).json({ ok: true, id: d.id });
  } catch (err) {
    console.error("send-email crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
