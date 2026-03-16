const https = require("https");
const SUPABASE_HOST = "vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

function sbInsert(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json", "Prefer": "return=representation", "Content-Length": Buffer.byteLength(data) };
    const req = https.request({ hostname: SUPABASE_HOST, path: "/rest/v1/gift_cards", method: "POST", headers }, res => {
      let buf = ""; res.on("data", c => buf += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, data: buf }); } });
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const card = req.body;
  if (!card || !card.code) return res.status(400).json({ error: "Missing card data" });
  try {
    const r = await sbInsert(card);
    if (r.status >= 400) return res.status(500).json({ error: "Insert failed", detail: r.data });
    const created = Array.isArray(r.data) ? r.data[0] : r.data;
    return res.status(200).json({ ok: true, card: created });
  } catch(err) { return res.status(500).json({ error: err.message }); }
};
