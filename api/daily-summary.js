const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const ARKESEL_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const H = { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function query(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  return r.json();
}

async function sendSMS(phone, message) {
  await fetch("https://sms.arkesel.com/sms/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send-sms", api_key: ARKESEL_KEY, to: phone, from: "Zolara", sms: message }),
  });
}

module.exports = async function handler(req, res) {
  // Allow manual trigger from dashboard (POST) or cron (GET)
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  // Simple auth check for manual trigger
  const authHeader = req.headers.authorization || "";
  const isManual = req.method === "POST";
  if (isManual && authHeader !== `Bearer ${SERVICE_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get Ghana time (GMT+0, same as UTC)
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const todayStart = today + "T00:00:00.000Z";
    const todayEnd = today + "T23:59:59.999Z";

    // Fetch today's sales
    const sales = await query(
      `sales?status=eq.completed&payment_date=gte.${todayStart}&payment_date=lte.${todayEnd}&select=amount,payment_method,service_name,notes`
    );

    if (!Array.isArray(sales)) throw new Error("Sales query failed");

    const totalRevenue = sales.reduce((s, p) => s + Number(p.amount || 0), 0);
    const giftCardRev = sales.filter(p => p.payment_method === "gift_card").reduce((s, p) => s + Number(p.amount || 0), 0);
    const productRev = sales.filter(p => p.notes && p.notes.toLowerCase().includes("product sale")).reduce((s, p) => s + Number(p.amount || 0), 0);
    const serviceRev = totalRevenue - giftCardRev - productRev;

    // Count completed bookings
    const bookings = await query(
      `bookings?status=eq.completed&preferred_date=eq.${today}&select=service_name,client_name`
    );
    const completedCount = Array.isArray(bookings) ? bookings.length : 0;

    // Top service
    const svcCounts = {};
    if (Array.isArray(bookings)) {
      for (const b of bookings) {
        const name = b.service_name || "Other";
        svcCounts[name] = (svcCounts[name] || 0) + 1;
      }
    }
    const topSvc = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0];

    const ownerPhone = "0594922679";

    // Build message
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dayLabel = days[now.getDay()] + ", " + now.getDate() + " " + months[now.getMonth()];
    const lines = [
      `📊 Zolara Daily Summary — ${dayLabel}`,
      ``,
      `💰 Total Revenue: GHS ${totalRevenue.toLocaleString("en", { minimumFractionDigits: 2 })}`,
      `   Service:  GHS ${serviceRev.toLocaleString("en", { minimumFractionDigits: 2 })}`,
      productRev > 0 ? `   Products: GHS ${productRev.toLocaleString("en", { minimumFractionDigits: 2 })}` : null,
      giftCardRev > 0 ? `   Gift Cards: GHS ${giftCardRev.toLocaleString("en", { minimumFractionDigits: 2 })}` : null,
      ``,
      `💆 Completed: ${completedCount} appointment${completedCount !== 1 ? "s" : ""}`,
      topSvc ? `🏆 Top Service: ${topSvc[0]} (${topSvc[1]}×)` : null,
      ``,
      `Zolara Beauty Studio 💛`,
    ].filter(l => l !== null).join("\n");

    await sendSMS(ownerPhone, lines);

    return res.status(200).json({
      ok: true,
      date: today,
      totalRevenue,
      completedBookings: completedCount,
      topService: topSvc?.[0] || null,
      sentTo: ownerPhone,
    });

  } catch (err) {
    console.error("Daily summary error:", err);
    return res.status(500).json({ error: err.message });
  }
};
