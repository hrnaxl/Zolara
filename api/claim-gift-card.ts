// Server-side gift card claiming — uses service role key, bypasses RLS
const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

async function sb(path: string, method = "GET", body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : method === "PATCH" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { data, ok: res.ok, status: res.status };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, buyerName, buyerEmail, buyerPhone, paymentRef } = req.body;

  if (!tier) return res.status(400).json({ error: "Missing tier" });

  try {
    // 1. Find an available pre-printed physical card of this tier
    const find = await sb(
      `gift_cards?tier=eq.${encodeURIComponent(tier)}&card_type=eq.physical&payment_status=eq.pending&limit=1`,
      "GET"
    );

    console.log("Find result:", find.status, JSON.stringify(find.data).slice(0, 200));

    if (!find.ok || !find.data || find.data.length === 0) {
      // No pre-printed card available — create a placeholder
      const placeholder = await sb("gift_cards", "POST", {
        code: `PENDING-${Date.now()}`,
        tier,
        amount: 1, // will be corrected manually
        balance: 1,
        status: "active",
        payment_status: "pending_pickup",
        card_type: "physical",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        recipient_name: buyerName,
        notes: `⚠️ No pre-printed card in inventory. Assign manually. Buyer: ${buyerName} / ${buyerPhone}. Ref: ${paymentRef || "N/A"}`,
      });
      return res.status(200).json({
        claimed: false,
        card: placeholder.data?.[0] || null,
        message: "No pre-printed card available — placeholder created",
      });
    }

    const card = find.data[0];

    // 2. Claim the card — mark as pending_pickup with buyer info
    const claim = await sb(
      `gift_cards?id=eq.${card.id}`,
      "PATCH",
      {
        payment_status: "pending_pickup",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        recipient_name: buyerName,
        notes: `Online pickup purchase. Buyer: ${buyerName} / ${buyerPhone}. Payment ref: ${paymentRef || "N/A"}`,
      }
    );

    console.log("Claim result:", claim.status, JSON.stringify(claim.data).slice(0, 200));

    return res.status(200).json({
      claimed: true,
      card: { ...card, ...claim.data?.[0] },
      message: "Card claimed successfully",
    });
  } catch (err: any) {
    console.error("Claim error:", err);
    return res.status(500).json({ error: err.message });
  }
}
