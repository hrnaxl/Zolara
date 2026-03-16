const https = require("https");

function resendPost(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3",
        "Content-Length": Buffer.byteLength(body),
      },
    }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch(e) { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on("error", e => reject(e));
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

  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) return res.status(400).json({ error: "Missing fields" });

    const result = await resendPost({
      from: "Zolara Beauty Studio <hello@zolarasalon.com>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    console.log("Resend:", result.status, JSON.stringify(result.data));

    if (result.status >= 400) {
      const errMsg = result.data?.message || result.data?.name || JSON.stringify(result.data);
      return res.status(500).json({ error: errMsg });
    }

    return res.status(200).json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error("send-email error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
