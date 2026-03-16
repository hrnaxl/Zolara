const https = require("https");

function resendPost(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3",
        "Content-Length": Buffer.byteLength(data),
      },
    }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
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
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ error: "Missing fields" });

    const r = await resendPost({
      from: "Zolara Beauty Studio <hello@zolarasalon.com>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    console.log("Resend:", r.status, JSON.stringify(r.body));

    if (r.status >= 400) {
      const errMsg = r.body?.message || r.body?.name || JSON.stringify(r.body);
      console.error("Resend error:", errMsg);
      return res.status(500).json({ error: errMsg });
    }

    return res.status(200).json({ ok: true, id: r.body?.id });
  } catch (err) {
    console.error("Email handler crash:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
