/**
 * Zolara send-email — Node https module (NOT fetch, which is unreliable in Vercel)
 * From: hello@zolarasalon.com (confirmed working in production March 15)
 */
const https = require("https");

const RESEND_KEY = "re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3";

function resendSend(to, subject, html) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: "Zolara Beauty Studio <hello@zolarasalon.com>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    const opts = {
      hostname: "api.resend.com",
      port: 443,
      path: "/emails",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, json: { raw: data } }); }
      });
    });
    req.on("error", (err) => reject(err));
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) return res.status(400).json({ error: "Missing to, subject, or html" });
  try {
    const r = await resendSend(to, subject, html);
    console.log("Resend response:", r.status, JSON.stringify(r.json));
    if (r.status >= 400) {
      const msg = (r.json && (r.json.message || r.json.name)) || JSON.stringify(r.json);
      return res.status(500).json({ error: msg });
    }
    return res.status(200).json({ ok: true, id: r.json && r.json.id });
  } catch (err) {
    console.error("send-email error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
