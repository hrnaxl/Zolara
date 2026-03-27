const SB = process.env.SUPABASE_URL + "/rest/v1";
const SK = process.env.SUPABASE_SERVICE_KEY;
const H = { "apikey": SK, "Authorization": "Bearer " + SK, "Content-Type": "application/json", "Prefer": "return=minimal" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing id" });
  await fetch(`${SB}/gift_cards?id=eq.${id}`, {
    method: "PATCH", headers: H,
    body: JSON.stringify({ payment_status: "sold", status: "active" }),
  });
  return res.status(200).json({ ok: true });
}
