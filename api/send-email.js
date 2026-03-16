const RESEND_API_KEY = "re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).json({ error: "Missing to, subject or html" });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Zolara Beauty Studio <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const d = await r.json();
    console.log("Resend", r.status, JSON.stringify(d));
    if (!r.ok) return res.status(500).json({ error: d.message || d.name || JSON.stringify(d) });
    return res.status(200).json({ ok: true, id: d.id });
  } catch (e) {
    console.error("send-email error:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
