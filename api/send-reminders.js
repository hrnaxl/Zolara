// Called daily by Vercel cron — sends 24-hour appointment reminders
const SB_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const ARKESEL_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const H = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };

function toIntl(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.startsWith("233")) return d;
  if (d.startsWith("0")) return "233" + d.slice(1);
  return d;
}

async function sendSMS(phone, message) {
  const intl = toIntl(phone);
  if (intl.length < 12) return;
  await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "Zolara", message, recipients: [intl] }),
  }).catch(() => {});
}

function firstName(name) {
  return (name || "").split(" ")[0] || "there";
}

export default async function handler(req, res) {
  // Allow GET for cron, POST for manual trigger
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Fetch all confirmed/pending bookings for tomorrow
    const r = await fetch(
      `${SB_URL}/rest/v1/bookings?preferred_date=eq.${tomorrowStr}&status=in.(confirmed,pending)&select=id,client_name,client_phone,service_name,preferred_time,staff_name,booking_ref&reminder_sent=not.is.true`,
      { headers: H }
    );
    const bookings = await r.json();

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: "No bookings tomorrow" });
    }

    let sent = 0;
    for (const b of bookings) {
      if (!b.client_phone) continue;
      const first = firstName(b.client_name);
      const time = (b.preferred_time || "").slice(0, 5);
      const stylist = b.staff_name ? `\nStylist: ${b.staff_name}` : "";
      const ref = b.booking_ref || b.id?.slice(0, 8).toUpperCase() || "";
      const message = [
        `Hi ${first}, this is a reminder for your Zolara appointment tomorrow.`,
        ``,
        `Service: ${b.service_name || "your appointment"}`,
        `Time: ${time}${stylist}`,
        `Ref: ${ref}`,
        ``,
        `Please arrive 5 minutes early. To cancel or reschedule, call us at least 24 hours before.`,
        ``,
        `Zolara Beauty Studio`,
        `0594365314 / 0208848707`,
      ].join("\n");

      await sendSMS(b.client_phone, message);
      sent++;

      // Mark reminder sent to avoid duplicates
      await fetch(`${SB_URL}/rest/v1/bookings?id=eq.${b.id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ reminder_sent: true }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true, sent, date: tomorrowStr });
  } catch (e) {
    console.error("send-reminders:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
