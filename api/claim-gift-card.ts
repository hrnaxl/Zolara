// Server-side gift card claiming — uses service role key, bypasses RLS
const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

const headers = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tier, buyerName, buyerEmail, buyerPhone, paymentRef } = req.body;
  if (!tier) return res.status(400).json({ error: "Missing tier" });

  console.log("Claim request:", { tier, buyerName, buyerPhone, paymentRef });

  try {
    // 1. Find an available pre-printed physical card
    const findUrl = `${SUPABASE_URL}/rest/v1/gift_cards?tier=eq.${encodeURIComponent(tier)}&card_type=eq.physical&payment_status=eq.pending&limit=1&select=id,code,serial_number,batch_id,tier,amount`;
    const findRes = await fetch(findUrl, { headers });
    const findData = await findRes.json();

    console.log("Find status:", findRes.status, "data:", JSON.stringify(findData));

    if (!findRes.ok) {
      return res.status(500).json({ error: "DB find failed", detail: findData });
    }

    if (!findData || findData.length === 0) {
      // No pre-printed card — create placeholder so purchase isn't lost
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_cards`, {
        method: "POST",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify({
          code: `PICKUP-${Date.now()}`,
          tier,
          amount: 1,
          balance: 1,
          status: "active",
          payment_status: "pending_pickup",
          card_type: "physical",
          buyer_name: buyerName || null,
          buyer_email: buyerEmail || null,
          buyer_phone: buyerPhone || null,
          recipient_name: buyerName,
          notes: `⚠️ No pre-printed ${tier} card in stock. ASSIGN MANUALLY. Buyer: ${buyerName} | Phone: ${buyerPhone} | Ref: ${paymentRef}`,
        }),
      });
      const insertData = await insertRes.json();
      console.log("Placeholder created:", insertRes.status, JSON.stringify(insertData));
      return res.status(200).json({
        claimed: false,
        card: Array.isArray(insertData) ? insertData[0] : insertData,
        message: "No stock — placeholder created",
      });
    }

    const card = findData[0];
    console.log("Claiming card:", card.id, card.code);

    // 2. Update the card — mark as pending_pickup with buyer info
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_cards?id=eq.${card.id}`, {
      method: "PATCH",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({
        payment_status: "pending_pickup",
        buyer_name: buyerName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: buyerPhone || null,
        recipient_name: buyerName,
        notes: `RESERVED FOR PICKUP. Buyer: ${buyerName} | Phone: ${buyerPhone} | Ref: ${paymentRef} | Date: ${new Date().toISOString()}`,
      }),
    });
    const updateData = await updateRes.json();
    console.log("Update status:", updateRes.status, "data:", JSON.stringify(updateData));

    if (!updateRes.ok) {
      return res.status(500).json({ error: "Failed to mark card reserved", detail: updateData });
    }

    return res.status(200).json({
      claimed: true,
      card: { ...card, ...(Array.isArray(updateData) ? updateData[0] : updateData) },
      message: "Card reserved successfully",
    });

  } catch (err: any) {
    console.error("Claim error:", err);
    return res.status(500).json({ error: err.message });
  }
}
