const https = require("https");

function post(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
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
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on("error", e => reject(e));
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const r1 = await post({ from: "Zolara <hello@zolarasalon.com>", to: ["harunateyib@gmail.com"], subject: "Test hello@zolarasalon.com", html: "<p>Test 1</p>" });
    const r2 = await post({ from: "Zolara <onboarding@resend.dev>", to: ["harunateyib@gmail.com"], subject: "Test onboarding@resend.dev", html: "<p>Test 2</p>" });
    return res.status(200).json({ hello_zolarasalon: r1, onboarding_resend: r2 });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
