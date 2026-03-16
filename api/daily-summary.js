const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const ARKESEL_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const H = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  const auth = req.headers.authorization || "";
  if (req.method === "POST" && auth !== "Bearer " + SERVICE_KEY) return res.status(401).json({ error: "Unauthorized" });

  try {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const today = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate());
    const todayStart = today + "T00:00:00.000Z";
    const todayEnd   = today + "T23:59:59.999Z";

    // Sales
    const sRes = await fetch(SUPABASE_URL + "/rest/v1/sales?status=eq.completed&payment_date=gte." + todayStart + "&payment_date=lte." + todayEnd + "&select=amount,payment_method,notes", { headers: H });
    const sales = await sRes.json();
    if (!Array.isArray(sales)) return res.status(500).json({ error: "Sales query failed", detail: sales });

    const total    = sales.reduce((s,p) => s + Number(p.amount||0), 0);
    const gcRev    = sales.filter(p => p.payment_method === "gift_card").reduce((s,p) => s + Number(p.amount||0), 0);
    const prodRev  = sales.filter(p => (p.notes||"").toLowerCase().includes("product sale")).reduce((s,p) => s + Number(p.amount||0), 0);
    const svcRev   = total - gcRev - prodRev;

    // Bookings
    const bRes = await fetch(SUPABASE_URL + "/rest/v1/bookings?status=eq.completed&preferred_date=eq." + today + "&select=service_name", { headers: H });
    const bookings = await bRes.json();
    const count = Array.isArray(bookings) ? bookings.length : 0;

    // Top service
    const svcMap = {};
    if (Array.isArray(bookings)) bookings.forEach(b => { const n = b.service_name||"Other"; svcMap[n]=(svcMap[n]||0)+1; });
    const top = Object.entries(svcMap).sort((a,b)=>b[1]-a[1])[0];

    // Date label
    const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dateLabel = DAYS[now.getDay()] + " " + now.getDate() + " " + MONTHS[now.getMonth()];

    // Format GHS
    const fmt = n => "GHS " + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",");

    const lines = [
      "Zolara Daily Summary",
      dateLabel,
      "",
      "Revenue: " + fmt(total),
      "  Services: " + fmt(svcRev),
      prodRev > 0 ? "  Products: " + fmt(prodRev) : null,
      gcRev > 0   ? "  Gift Cards: " + fmt(gcRev) : null,
      "",
      "Completed: " + count + " appointment" + (count!==1?"s":""),
      top ? "Top: " + top[0] + " (" + top[1] + "x)" : null,
      "",
      "Zolara Beauty Studio",
    ].filter(l => l !== null).join("\n");

    // Send SMS
    const smsRes = await fetch("https://sms.arkesel.com/sms/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action:"send-sms", api_key:ARKESEL_KEY, to:"0594922679", from:"Zolara", sms:lines }),
    });
    const smsData = await smsRes.json();

    return res.status(200).json({ ok: true, date: today, total, count, sentTo:"0594922679", sms: smsData });

  } catch(err) {
    console.error("daily-summary error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
