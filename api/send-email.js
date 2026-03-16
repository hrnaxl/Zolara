// Zolara send-email API — uses Node https (not fetch) for Vercel compatibility
const https = require("https");

const RESEND_KEY = "re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3";
const FROM = "Zolara Beauty Studio <noreply@noreply.zolarasalon.com>";

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
          catch { resolve({ status: res.statusCode, data: buf }); }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).json({ error: "Missing to/subject/html" });

    const r = await post(
      "api.resend.com",
      "/emails",
      { "Content-Type": "application/json", "Authorization": "Bearer " + RESEND_KEY },
      { from: FROM, to: Array.isArray(to) ? to : [to], subject, html }
    );

    console.log("Resend", r.status, JSON.stringify(r.data));

    if (r.status >= 400) {
      const msg = (r.data && (r.data.message || r.data.name)) || JSON.stringify(r.data);
      return res.status(500).json({ error: msg });
    }

    return res.status(200).json({ ok: true, id: r.data && r.data.id });
  } catch (err) {
    console.error("send-email crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
