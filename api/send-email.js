const RESEND_KEY = process.env.RESEND_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://zolarasalon.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
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
