const https = require("https");

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(data) } }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: buf }); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const KEY = "re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3";
  const H = { "Content-Type": "application/json", "Authorization": "Bearer " + KEY };

  const froms = [
    "Zolara <hello@zolarasalon.com>",
    "Zolara <onboarding@resend.dev>",
  ];
  const results = [];
  for (const from of froms) {
    try {
      const r = await post("api.resend.com", "/emails", H, {
        from, to: ["harunateyib@gmail.com"],
        subject: "Zolara Test — " + from,
        html: "<p>Test from: <b>" + from + "</b></p>",
      });
      results.push({ from, status: r.status, body: r.body });
    } catch(e) { results.push({ from, error: e.message }); }
  }
  return res.status(200).json({ results });
};
