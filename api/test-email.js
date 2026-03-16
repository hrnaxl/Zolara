const RESEND_API_KEY = "re_ihUNevoc_8cu2FmjzUevtnEpxD6aBTTK3";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Try 3 different from addresses and report results
  const results = [];
  const addresses = [
    "Zolara <hello@zolarasalon.com>",
    "Zolara <noreply@zolarasalon.com>",
    "Zolara <onboarding@resend.dev>",
  ];

  for (const from of addresses) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + RESEND_API_KEY },
        body: JSON.stringify({
          from,
          to: ["harunateyib@gmail.com"],
          subject: "Zolara Email Test — " + from,
          html: "<p>Test from: <b>" + from + "</b></p>",
        }),
      });
      const d = await r.json();
      results.push({ from, status: r.status, response: d });
    } catch(e) {
      results.push({ from, status: "fetch_error", error: e.message });
    }
  }

  return res.status(200).json({ results });
};
